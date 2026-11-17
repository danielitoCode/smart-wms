"""Admin CRUD + pre-approval lifecycle for transfer orders (v1.8.0 #290).

Cookie-auth + ADMIN role. Picking is on the picker-facing
/api/picking/transfer-orders/<to_id>/* surface (Pass 4.3); admin
approval is the dedicated /approvals surface (Pass 4.4).

State-machine + audit constants live in
services.transfer_order_service + constants.py respectively. This
module orchestrates the admin lifecycle without re-deriving state.
"""

import json
import math
import uuid
from typing import List, Optional

from flask import g, jsonify, request
from psycopg2.errors import UniqueViolation
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from datetime import datetime, timezone

from constants import (
    ACTION_TO_APPROVED,
    ACTION_TO_CANCELLED,
    ACTION_TO_CLOSED,
    ACTION_TO_CREATED,
    ACTION_TO_DELETED,
    ACTION_TO_LINE_SHORT_CLOSED,
    ACTION_TO_REJECTED,
    ACTION_TO_SUBMITTED,
)
from middleware.auth_middleware import check_warehouse_access, require_admin_or_page_permission, require_auth
from middleware.db import with_db
from routes.admin import admin_bp
from schemas.csv_import import TransferOrderImportRow
from services.audit_service import write_audit_log
from services.events_service import emit_event, resolve_source_external_id
from services.transfer_order_service import (
    TO_APPROVAL_APPROVED,
    TO_APPROVAL_PENDING,
    TO_APPROVAL_REJECTED,
    TO_LINE_PENDING,
    TO_LINE_PARTIALLY_PICKED,
    TO_LINE_APPROVED,
    TO_LINE_PICKED,
    TO_LINE_SHORT_CLOSED,
    TO_STATUS_AWAITING_APPROVAL,
    TO_STATUS_CANCELLED,
    TO_STATUS_CLOSED,
    TO_STATUS_OPEN,
    TO_STATUS_PARTIALLY_PICKED,
    evaluate_to_closure,
    generate_to_number,
    submit_picks,
    validate_header_transition,
    validate_line_transition,
)


# ============================================================
# Import schema
# ============================================================


class _ImportRequest(BaseModel):
    """Top-level shape for POST /api/admin/transfer-orders/import."""

    model_config = ConfigDict(extra="forbid")

    source_warehouse_code: str = Field(..., min_length=1, max_length=20)
    destination_warehouse_code: str = Field(..., min_length=1, max_length=20)
    notes: Optional[str] = Field(None, max_length=2000)
    records: List[dict] = Field(..., min_length=1, max_length=5000)

    @field_validator("source_warehouse_code", "destination_warehouse_code")
    @classmethod
    def _strip(cls, v):
        return v.strip()


# ----------------------------------------------------------------------
# Serialisation helpers
# ----------------------------------------------------------------------


def _serialise_to_header(row) -> dict:
    return {
        "to_id": row.to_id,
        "to_number": row.to_number,
        "source_warehouse_id": row.source_warehouse_id,
        "destination_warehouse_id": row.destination_warehouse_id,
        "status": row.status,
        "created_by": row.created_by,
        "notes": row.notes,
        "external_id": str(row.external_id),
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "reservations_tracked": getattr(row, "reservations_tracked", False),
    }


def _serialise_to_line(row) -> dict:
    return {
        "to_line_id": row.to_line_id,
        "to_id": row.to_id,
        "item_id": row.item_id,
        "sku": getattr(row, "sku", None),
        "item_name": getattr(row, "item_name", None),
        "line_number": row.line_number,
        "requested_qty": row.requested_qty,
        "committed_qty": row.committed_qty,
        "picked_qty": row.picked_qty,
        "approved_qty": row.approved_qty,
        "status": row.status,
        "reservations": getattr(row, "reservations", []) or [],
    }


def _serialise_to_approval(row) -> dict:
    return {
        "to_approval_id": row.to_approval_id,
        "to_id": row.to_id,
        "submitted_by": row.submitted_by,
        "submitted_at": row.submitted_at.isoformat() if row.submitted_at else None,
        "approved_by": row.approved_by,
        "approved_at": row.approved_at.isoformat() if row.approved_at else None,
        "rejected_at": row.rejected_at.isoformat() if row.rejected_at else None,
        "rejection_reason": row.rejection_reason,
        "status": row.status,
        "lines_snapshot": row.lines_snapshot,
        "external_id": str(row.external_id),
    }


# ----------------------------------------------------------------------
# Warehouse scope
# ----------------------------------------------------------------------


def _transfer_order_scope_sql() -> tuple[str, dict]:
    """Non-admin page grantees must be assigned to BOTH warehouses."""
    if g.current_user.get("role") == "ADMIN":
        return "", {}
    return (
        " AND source_warehouse_id = ANY(:_to_warehouse_scope)"
        " AND destination_warehouse_id = ANY(:_to_warehouse_scope)",
        {"_to_warehouse_scope": g.current_user.get("warehouse_ids") or []},
    )


def _check_transfer_order_warehouses(source_id: int, destination_id: int):
    for warehouse_id in (source_id, destination_id):
        allowed, denied = check_warehouse_access(warehouse_id)
        if not allowed:
            return denied
    return None


# ----------------------------------------------------------------------
# List + detail
# ----------------------------------------------------------------------


@admin_bp.route("/transfer-orders", methods=["GET"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def list_transfer_orders():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 1000)

    status_filter = request.args.get("status")
    source_warehouse = request.args.get("source_warehouse_id", type=int)
    destination_warehouse = request.args.get("destination_warehouse_id", type=int)

    scope_sql, params = _transfer_order_scope_sql()
    where_clauses = [scope_sql.removeprefix(' AND ')] if scope_sql else []
    if status_filter:
        where_clauses.append("status = :status")
        params["status"] = status_filter
    if source_warehouse:
        where_clauses.append("source_warehouse_id = :swid")
        params["swid"] = source_warehouse
    if destination_warehouse:
        where_clauses.append("destination_warehouse_id = :dwid")
        params["dwid"] = destination_warehouse

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    total = g.db.execute(
        text(f"SELECT COUNT(*) FROM transfer_orders {where_sql}"),
        params,
    ).scalar()
    pages = max(1, math.ceil(total / per_page)) if total else 1

    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page
    rows = g.db.execute(
        text(
            f"""
            SELECT to_id, to_number, source_warehouse_id, destination_warehouse_id,
                   status, created_by, notes, external_id, created_at, updated_at
              FROM transfer_orders {where_sql}
             ORDER BY to_id DESC
             LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()

    return jsonify({
        "transfer_orders": [_serialise_to_header(r) for r in rows],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": pages,
    })


@admin_bp.route("/transfer-orders/<int:to_id>", methods=["GET"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def get_transfer_order(to_id):
    scope_sql, scope_params = _transfer_order_scope_sql()
    header = g.db.execute(
        text(
            f"""
            SELECT to_id, to_number, source_warehouse_id, destination_warehouse_id,
                   status, created_by, notes, external_id, created_at, updated_at,
                   reservations_tracked
              FROM transfer_orders WHERE to_id = :tid {scope_sql}
            """
        ),
        {"tid": to_id, **scope_params},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404

    lines = g.db.execute(
        text(
            """
            SELECT tol.to_line_id, tol.to_id, tol.item_id,
                   i.sku, i.item_name,
                   tol.line_number, tol.requested_qty, tol.committed_qty,
                   tol.picked_qty, tol.approved_qty, tol.status,
                   COALESCE((
                       SELECT jsonb_agg(jsonb_build_object(
                           'reservation_id', tor.reservation_id,
                           'inventory_id', inv.inventory_id,
                           'bin_id', inv.bin_id,
                           'bin_code', b.bin_code,
                           'lot_number', inv.lot_number,
                           'reserved_qty', tor.reserved_qty,
                           'consumed_qty', tor.consumed_qty,
                           'released_qty', tor.released_qty,
                           'remaining_qty', tor.reserved_qty - tor.consumed_qty - tor.released_qty
                       ) ORDER BY inv.inventory_id)
                         FROM transfer_order_reservations tor
                         JOIN inventory inv ON inv.inventory_id = tor.inventory_id
                         JOIN bins b ON b.bin_id = inv.bin_id
                        WHERE tor.to_line_id = tol.to_line_id
                   ), '[]'::jsonb) AS reservations
              FROM transfer_order_lines tol
              JOIN items i ON i.item_id = tol.item_id
             WHERE tol.to_id = :tid
             ORDER BY tol.line_number
            """
        ),
        {"tid": to_id},
    ).fetchall()

    approvals = g.db.execute(
        text(
            """
            SELECT to_approval_id, to_id, submitted_by, submitted_at,
                   approved_by, approved_at, rejected_at, rejection_reason,
                   status, lines_snapshot, external_id
              FROM transfer_order_approvals
             WHERE to_id = :tid
             ORDER BY submitted_at DESC
            """
        ),
        {"tid": to_id},
    ).fetchall()

    return jsonify({
        "transfer_order": _serialise_to_header(header),
        "lines": [_serialise_to_line(r) for r in lines],
        "approvals": [_serialise_to_approval(r) for r in approvals],
    })


# ----------------------------------------------------------------------
# Pre-approval lifecycle: cancel + delete
# ----------------------------------------------------------------------


def _assert_line_reservation_ledger(db, to_line_id: int):
    row = db.execute(
        text(
            """
            SELECT tol.committed_qty, tol.approved_qty,
                   COALESCE(SUM(r.reserved_qty), 0) AS reserved_qty,
                   COALESCE(SUM(r.consumed_qty), 0) AS consumed_qty,
                   COALESCE(SUM(r.released_qty), 0) AS released_qty
              FROM transfer_order_lines tol
              LEFT JOIN transfer_order_reservations r ON r.to_line_id = tol.to_line_id
             WHERE tol.to_line_id = :lid
             GROUP BY tol.to_line_id, tol.committed_qty, tol.approved_qty
            """
        ),
        {"lid": to_line_id},
    ).fetchone()
    if not row:
        raise ValueError(f"transfer order line not found: {to_line_id}")
    outstanding = row.reserved_qty - row.consumed_qty - row.released_qty
    expected = row.committed_qty - row.approved_qty - row.released_qty
    if (
        row.reserved_qty != row.committed_qty
        or row.consumed_qty != row.approved_qty
        or row.released_qty > row.committed_qty - row.approved_qty
        or outstanding != expected
    ):
        raise ValueError(
            f"reservation ledger mismatch for transfer_order_line={to_line_id}: "
            f"committed={row.committed_qty}, approved={row.approved_qty}, "
            f"reserved={row.reserved_qty}, consumed={row.consumed_qty}, "
            f"released={row.released_qty}"
        )
    return row


def _release_line_reservations(db, to_line_id: int, quantity: Optional[int] = None) -> int:
    """Release only the unconsumed reservation owned by one TO line."""
    ledger = _assert_line_reservation_ledger(db, to_line_id)
    rows = db.execute(
        text(
            """
            SELECT r.reservation_id, r.reserved_qty, r.consumed_qty,
                   r.released_qty, inv.inventory_id, inv.quantity_allocated
              FROM transfer_order_reservations r
              JOIN inventory inv ON inv.inventory_id = r.inventory_id
             WHERE r.to_line_id = :lid
               AND r.reserved_qty > r.consumed_qty + r.released_qty
             ORDER BY inv.inventory_id ASC
             FOR UPDATE OF r, inv
            """
        ),
        {"lid": to_line_id},
    ).fetchall()
    outstanding = sum(row.reserved_qty - row.consumed_qty - row.released_qty for row in rows)
    target = outstanding if quantity is None else quantity
    if target < 0 or target > outstanding:
        raise ValueError(
            f"reservation mismatch for transfer_order_line={to_line_id}: "
            f"requested release={target}, outstanding={outstanding}"
        )
    remaining = target
    for row in rows:
        if remaining <= 0:
            break
        available = row.reserved_qty - row.consumed_qty - row.released_qty
        release_qty = min(remaining, available)
        if row.quantity_allocated < release_qty:
            raise ValueError(
                f"inventory allocation mismatch for inventory_id={row.inventory_id}: "
                f"allocated={row.quantity_allocated}, release={release_qty}"
            )
        reservation_changed = db.execute(
            text(
                """
                UPDATE transfer_order_reservations
                   SET released_qty = released_qty + :qty, updated_at = NOW()
                 WHERE reservation_id = :reservation_id
                   AND reserved_qty - consumed_qty - released_qty >= :qty
                RETURNING reservation_id
                """
            ),
            {"qty": release_qty, "reservation_id": row.reservation_id},
        ).fetchone()
        if not reservation_changed:
            raise ValueError(f"reservation changed for reservation_id={row.reservation_id}")
        changed = db.execute(
            text(
                """
                UPDATE inventory
                   SET quantity_allocated = quantity_allocated - :qty,
                       updated_at = NOW()
                 WHERE inventory_id = :inventory_id
                   AND quantity_allocated >= :qty
                RETURNING inventory_id
                """
            ),
            {"qty": release_qty, "inventory_id": row.inventory_id},
        ).fetchone()
        if not changed:
            raise ValueError(f"inventory allocation changed for inventory_id={row.inventory_id}")
        remaining -= release_qty
    if remaining:
        raise ValueError(f"reservation release incomplete for transfer_order_line={to_line_id}")
    return target


def _consume_line_reservations(db, to_line_id: int, quantity: int) -> None:
    """Consume the exact source inventory rows reserved by this TO line."""
    ledger = _assert_line_reservation_ledger(db, to_line_id)
    if quantity <= 0:
        raise ValueError(f"reservation consumption must be positive, got {quantity}")
    rows = db.execute(
        text(
            """
            SELECT r.reservation_id, r.reserved_qty, r.consumed_qty,
                   r.released_qty, inv.inventory_id,
                   inv.quantity_allocated, inv.quantity_on_hand
              FROM transfer_order_reservations r
              JOIN inventory inv ON inv.inventory_id = r.inventory_id
             WHERE r.to_line_id = :lid
               AND r.reserved_qty > r.consumed_qty + r.released_qty
             ORDER BY inv.inventory_id ASC
             FOR UPDATE OF r, inv
            """
        ),
        {"lid": to_line_id},
    ).fetchall()
    outstanding = sum(row.reserved_qty - row.consumed_qty - row.released_qty for row in rows)
    if outstanding != ledger.committed_qty - ledger.approved_qty - ledger.released_qty:
        raise ValueError(f"reservation balance changed for transfer_order_line={to_line_id}")
    if quantity > outstanding:
        raise ValueError(
            f"reservation mismatch for transfer_order_line={to_line_id}: "
            f"approval={quantity}, outstanding={outstanding}"
        )
    remaining = quantity
    for row in rows:
        if remaining <= 0:
            break
        available = row.reserved_qty - row.consumed_qty - row.released_qty
        consume_qty = min(remaining, available)
        if row.quantity_allocated < consume_qty or row.quantity_on_hand < consume_qty:
            raise ValueError(
                f"reserved inventory unavailable for inventory_id={row.inventory_id}: "
                f"allocated={row.quantity_allocated}, on_hand={row.quantity_on_hand}"
            )
        reservation_changed = db.execute(
            text(
                """
                UPDATE transfer_order_reservations
                   SET consumed_qty = consumed_qty + :qty, updated_at = NOW()
                 WHERE reservation_id = :reservation_id
                   AND reserved_qty - consumed_qty - released_qty >= :qty
                RETURNING reservation_id
                """
            ),
            {"qty": consume_qty, "reservation_id": row.reservation_id},
        ).fetchone()
        if not reservation_changed:
            raise ValueError(f"reservation changed for reservation_id={row.reservation_id}")
        changed = db.execute(
            text(
                """
                UPDATE inventory
                   SET quantity_allocated = quantity_allocated - :qty,
                       quantity_on_hand = quantity_on_hand - :qty,
                       updated_at = NOW()
                 WHERE inventory_id = :inventory_id
                   AND quantity_allocated >= :qty
                   AND quantity_on_hand >= :qty
                RETURNING inventory_id
                """
            ),
            {"qty": consume_qty, "inventory_id": row.inventory_id},
        ).fetchone()
        if not changed:
            raise ValueError(f"reserved inventory changed for inventory_id={row.inventory_id}")
        remaining -= consume_qty
    if remaining:
        raise ValueError(
            f"reservation consumption incomplete for transfer_order_line={to_line_id}: {remaining}"
        )


def _release_reservations(db, to_id: int) -> None:
    lines = db.execute(
        text(
            """
            SELECT tol.to_line_id, tol.committed_qty, tol.approved_qty,
                   COALESCE(SUM(r.reserved_qty), 0) AS reserved_qty,
                   COALESCE(SUM(r.consumed_qty), 0) AS consumed_qty,
                   COALESCE(SUM(r.released_qty), 0) AS released_qty
              FROM transfer_order_lines tol
              LEFT JOIN transfer_order_reservations r ON r.to_line_id = tol.to_line_id
             WHERE tol.to_id = :tid
             GROUP BY tol.to_line_id, tol.item_id, tol.committed_qty, tol.approved_qty
             ORDER BY tol.item_id ASC, tol.to_line_id ASC
            """
        ),
        {"tid": to_id},
    ).fetchall()
    for line in lines:
        expected_outstanding = line.committed_qty - line.approved_qty - line.released_qty
        actual_outstanding = line.reserved_qty - line.consumed_qty - line.released_qty
        if (
            line.reserved_qty != line.committed_qty
            or line.consumed_qty != line.approved_qty
            or actual_outstanding != expected_outstanding
        ):
            raise ValueError(
                f"reservation ledger mismatch for transfer_order_line={line.to_line_id}: "
                f"committed={line.committed_qty}, approved={line.approved_qty}, "
                f"reserved={line.reserved_qty}, consumed={line.consumed_qty}, "
                f"released={line.released_qty}"
            )
        _release_line_reservations(db, line.to_line_id, expected_outstanding)


@admin_bp.route("/transfer-orders/<int:to_id>/cancel", methods=["POST"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def cancel_transfer_order(to_id):
    header = g.db.execute(
        text(
            "SELECT to_id, to_number, status, source_warehouse_id, destination_warehouse_id, "
            "       reservations_tracked FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    denied = _check_transfer_order_warehouses(header.source_warehouse_id, header.destination_warehouse_id)
    if denied:
        return denied
    if not header.reservations_tracked:
        return jsonify({
            "error": "reservation_tracking_unavailable",
            "detail": "Legacy transfer order has no attributable per-line reservation records. Reconcile inventory before cancelling.",
        }), 409

    try:
        validate_header_transition(header.status, TO_STATUS_CANCELLED)
    except ValueError as exc:
        return jsonify({
            "error": "invalid_status_for_cancel",
            "current_status": header.status,
            "detail": str(exc),
        }), 409

    # A submitted snapshot is an in-flight transfer decision. Do not
    # release its reservation while an approval could still move it.
    approval_count = g.db.execute(
        text(
            "SELECT COUNT(*) FROM transfer_order_approvals "
            " WHERE to_id = :tid"
        ),
        {"tid": to_id},
    ).scalar()
    if approval_count > 0:
        return jsonify({
            "error": "to_already_partially_approved",
            "approval_count": approval_count,
        }), 409

    try:
        _release_reservations(g.db, to_id)
    except ValueError as exc:
        g.db.rollback()
        return jsonify({"error": "reservation_integrity_error", "detail": str(exc)}), 409

    g.db.execute(
        text(
            "UPDATE transfer_orders SET status = :st, updated_at = NOW() "
            " WHERE to_id = :tid"
        ),
        {"st": TO_STATUS_CANCELLED, "tid": to_id},
    )

    write_audit_log(
        g.db,
        action_type=ACTION_TO_CANCELLED,
        entity_type="TO",
        entity_id=to_id,
        user_id=g.current_user["username"],
        warehouse_id=header.source_warehouse_id,
        details={
            "to_number": header.to_number,
            "previous_status": header.status,
        },
    )
    g.db.commit()
    return jsonify({"to_id": to_id, "status": TO_STATUS_CANCELLED})


@admin_bp.route("/transfer-orders/<int:to_id>", methods=["DELETE"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def delete_transfer_order(to_id):
    header = g.db.execute(
        text(
            "SELECT to_id, to_number, status, source_warehouse_id, destination_warehouse_id, "
            "       reservations_tracked FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    denied = _check_transfer_order_warehouses(header.source_warehouse_id, header.destination_warehouse_id)
    if denied:
        return denied
    if not header.reservations_tracked:
        return jsonify({
            "error": "reservation_tracking_unavailable",
            "detail": "Legacy transfer order has no attributable per-line reservation records. Reconcile inventory before deleting.",
        }), 409

    # Hard delete only allowed pre-approval and pre-pick. Once any line
    # has picked_qty > 0 OR any approval row exists, the audit trail
    # would lose state; require cancel instead.
    any_picks = g.db.execute(
        text(
            "SELECT COUNT(*) FROM transfer_order_lines "
            " WHERE to_id = :tid AND picked_qty > 0"
        ),
        {"tid": to_id},
    ).scalar()
    any_approvals = g.db.execute(
        text(
            "SELECT COUNT(*) FROM transfer_order_approvals "
            " WHERE to_id = :tid"
        ),
        {"tid": to_id},
    ).scalar()
    if any_picks > 0 or any_approvals > 0:
        return jsonify({
            "error": "to_not_deletable",
            "any_picks": any_picks,
            "any_approvals": any_approvals,
            "detail": (
                "Use cancel for TOs with picks or approvals; delete "
                "only applies to OPEN TOs with no downstream activity."
            ),
        }), 409

    try:
        _release_reservations(g.db, to_id)
    except ValueError as exc:
        g.db.rollback()
        return jsonify({"error": "reservation_integrity_error", "detail": str(exc)}), 409

    write_audit_log(
        g.db,
        action_type=ACTION_TO_DELETED,
        entity_type="TO",
        entity_id=to_id,
        user_id=g.current_user["username"],
        warehouse_id=header.source_warehouse_id,
        details={
            "to_number": header.to_number,
            "previous_status": header.status,
        },
    )
    g.db.execute(
        text("DELETE FROM transfer_orders WHERE to_id = :tid"),
        {"tid": to_id},
    )
    g.db.commit()
    return ("", 204)


# ----------------------------------------------------------------------
# Line short-close
# ----------------------------------------------------------------------


@admin_bp.route(
    "/transfer-orders/<int:to_id>/lines/<int:line_id>/short-close",
    methods=["POST"],
)
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def short_close_to_line(to_id, line_id):
    header = g.db.execute(
        text("SELECT reservations_tracked FROM transfer_orders WHERE to_id = :tid FOR UPDATE"),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    if not header.reservations_tracked:
        return jsonify({
            "error": "reservation_tracking_unavailable",
            "detail": "Legacy transfer order has no attributable per-line reservation records. Reconcile inventory before short-closing.",
        }), 409

    line = g.db.execute(
        text(
            """
            SELECT tol.to_line_id, tol.to_id, tol.item_id, tol.line_number,
                   tol.requested_qty, tol.committed_qty, tol.picked_qty,
                   tol.approved_qty, tol.status,
                   o.source_warehouse_id, o.destination_warehouse_id, o.to_number
              FROM transfer_order_lines tol
              JOIN transfer_orders o ON o.to_id = tol.to_id
             WHERE tol.to_line_id = :lid AND tol.to_id = :tid
             FOR UPDATE OF tol
            """
        ),
        {"lid": line_id, "tid": to_id},
    ).fetchone()
    if not line:
        return jsonify({"error": "Transfer order line not found"}), 404
    denied = _check_transfer_order_warehouses(line.source_warehouse_id, line.destination_warehouse_id)
    if denied:
        return denied

    pending_approval = g.db.execute(
        text(
            "SELECT to_approval_id FROM transfer_order_approvals "
            " WHERE to_id = :tid AND status = 'PENDING' "
            " ORDER BY to_approval_id LIMIT 1"
        ),
        {"tid": to_id},
    ).fetchone()
    if pending_approval:
        return jsonify({
            "error": "line_has_pending_approval",
            "to_approval_id": pending_approval.to_approval_id,
        }), 409

    try:
        validate_line_transition(line.status, TO_LINE_SHORT_CLOSED)
    except ValueError as exc:
        return jsonify({
            "error": "invalid_line_status_for_short_close",
            "current_status": line.status,
            "detail": str(exc),
        }), 409

    # Short-close releases only this line's exact unconsumed reservation.
    remaining = line.committed_qty - line.approved_qty
    try:
        released = _release_line_reservations(g.db, line_id, remaining)
    except ValueError as exc:
        g.db.rollback()
        return jsonify({"error": "reservation_integrity_error", "detail": str(exc)}), 409

    g.db.execute(
        text(
            "UPDATE transfer_order_lines "
            "   SET status = :st "
            " WHERE to_line_id = :lid"
        ),
        {"st": TO_LINE_SHORT_CLOSED, "lid": line_id},
    )

    write_audit_log(
        g.db,
        action_type=ACTION_TO_LINE_SHORT_CLOSED,
        entity_type="TO_LINE",
        entity_id=line_id,
        user_id=g.current_user["username"],
        warehouse_id=line.source_warehouse_id,
        details={
            "to_id": to_id,
            "to_number": line.to_number,
            "line_number": line.line_number,
            "previous_status": line.status,
            "released_qty": released,
        },
    )
    g.db.commit()
    return jsonify({
        "to_line_id": line_id,
        "status": TO_LINE_SHORT_CLOSED,
        "released_qty": released,
    })


# ============================================================
# CSV import (#291)
# ============================================================


def _resolve_warehouse_id(db, code: str) -> Optional[int]:
    row = db.execute(
        text(
            "SELECT warehouse_id FROM warehouses "
            " WHERE warehouse_code = :code AND is_active = TRUE"
        ),
        {"code": code},
    ).fetchone()
    return row.warehouse_id if row else None


@admin_bp.route("/transfer-orders/import", methods=["POST"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def import_transfer_order():
    """Build a single TO from a list of (sku, quantity) records.

    Reservations land in inventory.quantity_allocated at the source
    warehouse so SO ATP at picking_service.py:106-125 sees the
    reservation automatically (no SO-side code change). Lines whose
    requested_qty exceeds available are accepted with
    committed_qty = available; the response carries a shortage payload
    so the frontend renders the ShortageModal.
    """

    try:
        body = _ImportRequest.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({
            "error": "validation_error",
            "details": exc.errors(include_url=False, include_context=False),
        }), 422

    if body.source_warehouse_code == body.destination_warehouse_code:
        return jsonify({
            "error": "source_and_destination_must_differ",
            "warehouse_code": body.source_warehouse_code,
        }), 422

    src_id = _resolve_warehouse_id(g.db, body.source_warehouse_code)
    if src_id is None:
        return jsonify({
            "error": "unknown_warehouse",
            "field": "source_warehouse_code",
            "value": body.source_warehouse_code,
        }), 404
    dst_id = _resolve_warehouse_id(g.db, body.destination_warehouse_code)
    if dst_id is None:
        return jsonify({
            "error": "unknown_warehouse",
            "field": "destination_warehouse_code",
            "value": body.destination_warehouse_code,
        }), 404
    denied = _check_transfer_order_warehouses(src_id, dst_id)
    if denied:
        return denied

    # Per-row Pydantic + SKU resolution. Aggregate row errors so the
    # operator sees every bad row at once rather than fixing one at a
    # time.
    errors = []
    rows = []  # list of {row_index, sku, item_id, requested_qty}
    for idx, raw in enumerate(body.records):
        try:
            row = TransferOrderImportRow.model_validate(raw)
        except ValidationError as exc:
            errors.append({
                "row_index": idx,
                "error_kind": "validation_error",
                "details": exc.errors(
                    include_url=False, include_context=False,
                ),
            })
            continue
        item_row = g.db.execute(
            text("SELECT item_id FROM items WHERE sku = :sku"),
            {"sku": row.sku},
        ).fetchone()
        if item_row is None:
            errors.append({
                "row_index": idx,
                "error_kind": "unknown_sku",
                "sku": row.sku,
            })
            continue
        rows.append({
            "row_index": idx,
            "sku": row.sku,
            "item_id": item_row.item_id,
            "requested_qty": row.quantity,
        })
    if errors:
        return jsonify({
            "error": "row_errors",
            "rows": errors,
        }), 422

    # Sort by item_id ASC before locking inventory. This matches the
    # picker + cancel-release ordering so concurrent operations
    # acquire row locks in a deterministic sequence (deadlock
    # prevention; plan section 4.4).
    rows.sort(key=lambda r: r["item_id"])

    # Inventory is per-bin (one row per (item_id, bin_id, lot_number))
    # so the reservation distributes across all rows for (item,
    # warehouse). Walk rows in inventory_id ASC under FOR UPDATE OF
    # inv to match the picking_service.py:106-125 lock ordering;
    # decrement quantity_on_hand-quantity_allocated availability per
    # row until requested_qty is satisfied or rows exhausted.
    shortages = []
    line_inserts = []  # (item_id, line_number, requested, committed, allocations)
    for line_number, row in enumerate(rows, start=1):
        inv_rows = g.db.execute(
            text(
                """
                SELECT inv.inventory_id, inv.quantity_on_hand,
                       inv.quantity_allocated
                  FROM inventory inv
                 WHERE inv.item_id = :iid AND inv.warehouse_id = :wid
                 ORDER BY inv.inventory_id ASC
                 FOR UPDATE OF inv
                """
            ),
            {"iid": row["item_id"], "wid": src_id},
        ).fetchall()
        total_available = sum(
            max(0, ir.quantity_on_hand - ir.quantity_allocated)
            for ir in inv_rows
        )
        committed = max(0, min(row["requested_qty"], total_available))
        remaining = committed
        allocations = []
        for ir in inv_rows:
            if remaining <= 0:
                break
            avail = max(0, ir.quantity_on_hand - ir.quantity_allocated)
            take = min(remaining, avail)
            if take == 0:
                continue
            g.db.execute(
                text(
                    "UPDATE inventory "
                    "   SET quantity_allocated = quantity_allocated + :delta "
                    " WHERE inventory_id = :inv_id"
                ),
                {"delta": take, "inv_id": ir.inventory_id},
            )
            allocations.append((ir.inventory_id, take))
            remaining -= take
        if committed < row["requested_qty"]:
            shortages.append({
                "row_index": row["row_index"],
                "sku": row["sku"],
                "requested_qty": row["requested_qty"],
                "available_qty": total_available,
                "committed_qty": committed,
                "shortfall": row["requested_qty"] - committed,
            })
        line_inserts.append((
            row["item_id"], line_number, row["requested_qty"], committed, allocations,
        ))

    # Insert the header with ON CONFLICT DO NOTHING. Do not rollback the
    # whole transaction for a generated to_number collision: inventory
    # allocations were already locked and updated above and must remain
    # paired with the reservation rows inserted below.
    to_id = None
    for attempt in range(2):
        to_number = generate_to_number()
        result = g.db.execute(
            text(
                """
                INSERT INTO transfer_orders
                    (to_number, source_warehouse_id, destination_warehouse_id,
                     created_by, notes, external_id, reservations_tracked)
                VALUES (:tn, :src, :dst, :cby, :notes, :ext, TRUE)
                ON CONFLICT (to_number) DO NOTHING
                RETURNING to_id, to_number
                """
            ),
            {
                "tn": to_number,
                "src": src_id,
                "dst": dst_id,
                "cby": g.current_user["username"],
                "notes": body.notes,
                "ext": str(uuid.uuid4()),
            },
        )
        row = result.fetchone()
        if row:
            to_id = row.to_id
            to_number = row.to_number
            break
    if to_id is None:
        return jsonify({"error": "to_number_collision"}), 500

    for item_id, line_number, requested, committed, allocations in line_inserts:
        # Pick the line state at insert time: PENDING when fully
        # committed, SHORT_CLOSED when committed=0 (no available
        # inventory to commit so the line cannot be picked). Plan
        # section 4.13 marks committed=0 as a valid shortage path;
        # the line lands SHORT_CLOSED so it does not block closure
        # and the operator surfaces it in the shortage modal.
        line_status = TO_LINE_PENDING if committed > 0 else TO_LINE_SHORT_CLOSED
        line_row = g.db.execute(
            text(
                """
                INSERT INTO transfer_order_lines
                    (to_id, item_id, line_number, requested_qty,
                     committed_qty, status)
                VALUES (:tid, :iid, :ln, :req, :com, :st)
                RETURNING to_line_id
                """
            ),
            {
                "tid": to_id, "iid": item_id, "ln": line_number,
                "req": requested, "com": committed, "st": line_status,
            },
        ).fetchone()
        for inventory_id, reserved_qty in allocations:
            g.db.execute(
                text(
                    """
                    INSERT INTO transfer_order_reservations
                        (to_line_id, inventory_id, reserved_qty)
                    VALUES (:lid, :iid, :qty)
                    """
                ),
                {"lid": line_row.to_line_id, "iid": inventory_id, "qty": reserved_qty},
            )

    write_audit_log(
        g.db,
        action_type=ACTION_TO_CREATED,
        entity_type="TO",
        entity_id=to_id,
        user_id=g.current_user["username"],
        warehouse_id=src_id,
        details={
            "to_number": to_number,
            "source_warehouse_id": src_id,
            "destination_warehouse_id": dst_id,
            "line_count": len(line_inserts),
            "shortage_count": len(shortages),
        },
    )
    g.db.commit()

    return jsonify({
        "to_id": to_id,
        "to_number": to_number,
        "source_warehouse_id": src_id,
        "destination_warehouse_id": dst_id,
        "line_count": len(line_inserts),
        "shortages": shortages,
    }), 201


# ============================================================
# Start-picking (#292)
# ============================================================


@admin_bp.route(
    "/transfer-orders/<int:to_id>/start-picking", methods=["POST"],
)
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def start_to_picking(to_id):
    """Create a pick_batch + pick_tasks for the TO so the picker can
    scan via the existing mobile picking flow.

    One pick_task per (TO line, reserved inventory bin) at the source
    warehouse. Tasks are generated from transfer_order_reservations,
    never from the shared quantity_allocated pool. Inventory rows are
    locked in item_id/inventory_id order, matching import and release.
    The XOR CHECK from mig 049 enforces so_id NULL +
    to_id NOT NULL on every inserted row.
    """
    header = g.db.execute(
        text(
            "SELECT to_id, to_number, status, source_warehouse_id, destination_warehouse_id, "
            "       reservations_tracked FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    denied = _check_transfer_order_warehouses(header.source_warehouse_id, header.destination_warehouse_id)
    if denied:
        return denied
    if not header.reservations_tracked:
        return jsonify({
            "error": "reservation_tracking_unavailable",
            "detail": "Legacy transfer order has no attributable per-line reservations and cannot enter picking.",
        }), 409
    if header.status not in (TO_STATUS_OPEN, TO_STATUS_PARTIALLY_PICKED):
        return jsonify({
            "error": "invalid_status_for_start_picking",
            "current_status": header.status,
        }), 409
    pending_approval = g.db.execute(
        text(
            "SELECT to_approval_id FROM transfer_order_approvals "
            " WHERE to_id = :tid AND status = 'PENDING' "
            " ORDER BY to_approval_id LIMIT 1"
        ),
        {"tid": to_id},
    ).fetchone()
    if pending_approval:
        return jsonify({
            "error": "pending_approval_exists",
            "to_approval_id": pending_approval.to_approval_id,
        }), 409

    pending_tasks = g.db.execute(
        text(
            "SELECT COUNT(*) FROM pick_tasks "
            " WHERE to_id = :tid AND status = 'PENDING'"
        ),
        {"tid": to_id},
    ).scalar()
    if pending_tasks:
        return jsonify({
            "error": "pending_pick_tasks_exist",
            "pending_tasks": pending_tasks,
            "detail": "Complete or resolve the current picking batch before starting another.",
        }), 409

    # Build the next task plan exclusively from the inventory rows owned by
    # each TO line. Never redistribute a line across arbitrary SKU bins:
    # quantity_allocated is shared with Sales Orders and is not an ownership
    # record. Locks follow item_id -> inventory_id order, matching import,
    # approval, and release paths.
    lines = g.db.execute(
        text(
            """
            SELECT to_line_id, item_id, line_number,
                   committed_qty, picked_qty, approved_qty
              FROM transfer_order_lines
             WHERE to_id = :tid
               AND status IN ('PENDING', 'PARTIALLY_PICKED')
               AND committed_qty > picked_qty
             ORDER BY item_id, line_number, to_line_id
            """
        ),
        {"tid": to_id},
    ).fetchall()
    if not lines:
        return jsonify({
            "error": "no_lines_to_pick",
            "detail": "Every line is either fully picked or short-closed.",
        }), 409

    task_plan = []
    for line in lines:
        allocations = g.db.execute(
            text(
                """
                SELECT r.reservation_id, r.reserved_qty, r.consumed_qty,
                       r.released_qty, inv.inventory_id, inv.bin_id,
                       inv.quantity_on_hand, inv.quantity_allocated,
                       COALESCE((
                           SELECT SUM(pt.quantity_picked)
                             FROM pick_tasks pt
                            WHERE pt.to_line_id = r.to_line_id
                              AND pt.bin_id = inv.bin_id
                              AND pt.status IN ('PICKED', 'SHORT')
                       ), 0) AS picked_in_bin
                  FROM transfer_order_reservations r
                  JOIN inventory inv ON inv.inventory_id = r.inventory_id
                 WHERE r.to_line_id = :lid
                 ORDER BY inv.inventory_id
                 FOR UPDATE OF r, inv
                """
            ),
            {"lid": line.to_line_id},
        ).fetchall()

        reserved_total = sum(row.reserved_qty for row in allocations)
        consumed_total = sum(row.consumed_qty for row in allocations)
        released_total = sum(row.released_qty for row in allocations)
        picked_total = sum(row.picked_in_bin for row in allocations)
        outstanding_total = sum(
            row.reserved_qty - row.consumed_qty - row.released_qty
            for row in allocations
        )
        expected_outstanding = line.committed_qty - line.approved_qty - released_total
        expected_to_pick = line.committed_qty - line.picked_qty - released_total
        if (
            reserved_total != line.committed_qty
            or consumed_total != line.approved_qty
            or released_total > line.committed_qty - line.approved_qty
            or outstanding_total != expected_outstanding
            or picked_total != line.picked_qty
            or expected_to_pick < 0
        ):
            g.db.rollback()
            return jsonify({
                "error": "reservation_integrity_error",
                "to_line_id": line.to_line_id,
                "detail": "The per-bin reservation ledger does not match committed, approved and picked quantities.",
            }), 409

        planned_for_line = 0
        for allocation in allocations:
            # Picked includes both approved and not-yet-approved scans. The
            # consumed part must be represented in this same bin's pick-task
            # history; otherwise the ledger/task history has drifted.
            if (
                allocation.picked_in_bin < allocation.consumed_qty
                or allocation.picked_in_bin > allocation.reserved_qty - allocation.released_qty
            ):
                g.db.rollback()
                return jsonify({
                    "error": "reservation_integrity_error",
                    "to_line_id": line.to_line_id,
                    "inventory_id": allocation.inventory_id,
                    "detail": "Approved or picked quantity does not match this bin's reservation history.",
                }), 409
            # Subtract all picks from the original bin to avoid recreating
            # tasks for units already picked in a previous batch.
            remaining_in_bin = (
                allocation.reserved_qty
                - allocation.released_qty
                - allocation.picked_in_bin
            )
            if remaining_in_bin < 0:
                g.db.rollback()
                return jsonify({
                    "error": "reservation_integrity_error",
                    "to_line_id": line.to_line_id,
                    "inventory_id": allocation.inventory_id,
                    "detail": "Picked quantity exceeds the bin reservation.",
                }), 409
            if remaining_in_bin == 0:
                continue
            reservation_open = (
                allocation.reserved_qty
                - allocation.consumed_qty
                - allocation.released_qty
            )
            if (
                allocation.quantity_allocated < reservation_open
                or allocation.quantity_on_hand < remaining_in_bin
            ):
                g.db.rollback()
                return jsonify({
                    "error": "no_pickable_inventory",
                    "to_line_id": line.to_line_id,
                    "inventory_id": allocation.inventory_id,
                    "bin_id": allocation.bin_id,
                    "remaining": remaining_in_bin,
                    "available": allocation.quantity_on_hand,
                }), 409
            task_plan.append({
                "to_line_id": line.to_line_id,
                "item_id": line.item_id,
                "line_number": line.line_number,
                "inventory_id": allocation.inventory_id,
                "bin_id": allocation.bin_id,
                "quantity": remaining_in_bin,
            })
            planned_for_line += remaining_in_bin

        if planned_for_line != expected_to_pick:
            g.db.rollback()
            return jsonify({
                "error": "reservation_integrity_error",
                "to_line_id": line.to_line_id,
                "detail": "Per-bin remaining quantities do not equal the line's unpicked commitment.",
            }), 409

    if not task_plan:
        return jsonify({
            "error": "no_lines_to_pick",
            "detail": "Every committed unit is already picked or short-closed.",
        }), 409

    # Create the batch only after every line's reservation plan has passed
    # validation, so no partial batch survives a stock/ledger mismatch.
    from datetime import datetime
    batch_number = (
        f"BATCH-TO-{header.to_number[3:]}-"
        f"{datetime.now().strftime('%H%M%S%f')[:9]}"
    )
    batch_row = g.db.execute(
        text(
            "INSERT INTO pick_batches "
            "(batch_number, warehouse_id, status, assigned_to) "
            "VALUES (:bn, :wid, 'OPEN', :user) RETURNING batch_id"
        ),
        {
            "bn": batch_number,
            "wid": header.source_warehouse_id,
            "user": g.current_user["username"],
        },
    ).fetchone()
    batch_id = batch_row.batch_id

    pick_sequence = 0
    for task in sorted(task_plan, key=lambda row: (
        row["line_number"], row["inventory_id"],
    )):
        pick_sequence += 1
        g.db.execute(
            text(
                """
                INSERT INTO pick_tasks
                    (batch_id, to_id, to_line_id, item_id, bin_id,
                     quantity_to_pick, pick_sequence, status)
                VALUES (:bid, :tid, :lid, :iid, :binid, :qty,
                        :seq, 'PENDING')
                """
            ),
            {
                "bid": batch_id,
                "tid": to_id,
                "lid": task["to_line_id"],
                "iid": task["item_id"],
                "binid": task["bin_id"],
                "qty": task["quantity"],
                "seq": pick_sequence,
            },
        )

    g.db.commit()
    return jsonify({
        "batch_id": batch_id,
        "batch_number": batch_number,
        "tasks_created": len(task_plan),
    }), 201


# ============================================================
# Picker-facing TO read endpoint (#292)
# ============================================================


@admin_bp.route("/picker/transfer-orders/<int:to_id>", methods=["GET"])
@require_auth
@with_db
def picker_get_transfer_order(to_id):
    """Read-only TO state for the mobile picking screen. No ADMIN
    gate; any authenticated user with warehouse access can view."""
    header = g.db.execute(
        text(
            """
            SELECT to_id, to_number, source_warehouse_id,
                   destination_warehouse_id, status,
                   created_by, notes, external_id, created_at, updated_at,
                   reservations_tracked
              FROM transfer_orders WHERE to_id = :tid
            """
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    allowed, denied = check_warehouse_access(header.source_warehouse_id)
    if not allowed:
        return denied

    lines = g.db.execute(
        text(
            """
            SELECT tol.to_line_id, tol.to_id, tol.item_id,
                   i.sku, i.item_name,
                   tol.line_number, tol.requested_qty, tol.committed_qty,
                   tol.picked_qty, tol.approved_qty, tol.status
              FROM transfer_order_lines tol
              JOIN items i ON i.item_id = tol.item_id
             WHERE tol.to_id = :tid
             ORDER BY tol.line_number
            """
        ),
        {"tid": to_id},
    ).fetchall()

    return jsonify({
        "transfer_order": _serialise_to_header(header),
        "lines": [_serialise_to_line(r) for r in lines],
    })


# ============================================================
# Picker submit (#293)
# ============================================================


@admin_bp.route("/picker/transfer-orders/<int:to_id>/submit", methods=["POST"])
@require_auth
@with_db
def submit_transfer_order_picks(to_id):
    """Picker batches their picks since the last submit into a
    transfer_order_approvals row for admin review. Multiple submits
    per TO are normal: each batch is approved or rejected
    independently. Inventory does not move at submit time.
    """
    header = g.db.execute(
        text("SELECT source_warehouse_id FROM transfer_orders WHERE to_id = :tid"),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    allowed, denied = check_warehouse_access(header.source_warehouse_id)
    if not allowed:
        return denied
    result = submit_picks(g.db, to_id, g.current_user["username"])
    if not result["ok"]:
        reason = result["reason"]
        if reason == "not_found":
            return jsonify({"error": "Transfer order not found"}), 404
        if reason == "invalid_status":
            return jsonify({
                "error": "invalid_status_for_submit",
                "current_status": result["current_status"],
            }), 409
        if reason == "pending_approval_exists":
            return jsonify({
                "error": "pending_approval_exists",
                "to_approval_id": result["to_approval_id"],
            }), 409
        if reason == "reservation_tracking_unavailable":
            return jsonify({
                "error": "reservation_tracking_unavailable",
                "detail": "Legacy transfer order has no attributable per-line reservations and cannot submit picks.",
            }), 409
        # nothing_picked
        return jsonify({
            "error": "nothing_picked",
            "detail": (
                "No new picks since the last submit. Pick more lines "
                "before submitting."
            ),
        }), 422
    g.db.commit()
    return jsonify({
        "to_approval_id": result["to_approval_id"],
        "status": "PENDING",
        "to_status": result["to_status"],
        "line_count": result["line_count"],
    }), 201


# ============================================================
# Admin approve (#293)
# ============================================================


def _self_approval_blocked(db) -> bool:
    row = db.execute(
        text(
            "SELECT value FROM app_settings "
            " WHERE key = 'transfer_order_block_self_approval'"
        ),
    ).fetchone()
    return bool(row and str(row.value).lower() == "true")


def _credit_destination_inventory(
    db, item_id: int, dest_warehouse_id: int, qty: int,
) -> None:
    """Add qty to the destination warehouse's inventory. Targets the
    first Staging bin at the destination; INSERTs a new inventory
    row if none exists for the (item, bin) pair. Raises ValueError
    when the destination has no Staging bin (operator must add one).
    """
    bin_row = db.execute(
        text(
            """
            SELECT bin_id FROM bins
             WHERE warehouse_id = :wid
               AND bin_type = 'Staging'
             ORDER BY bin_id ASC LIMIT 1
            """
        ),
        {"wid": dest_warehouse_id},
    ).fetchone()
    if not bin_row:
        raise ValueError(
            f"destination warehouse_id={dest_warehouse_id} has no "
            f"Staging bin; add one before approving the transfer."
        )
    bin_id = bin_row.bin_id
    existing = db.execute(
        text(
            """
            SELECT inventory_id FROM inventory
             WHERE item_id = :iid AND bin_id = :bid AND lot_number IS NULL
             FOR UPDATE
            """
        ),
        {"iid": item_id, "bid": bin_id},
    ).fetchone()
    if existing:
        db.execute(
            text(
                "UPDATE inventory "
                "   SET quantity_on_hand = quantity_on_hand + :qty, "
                "       updated_at = NOW() "
                " WHERE inventory_id = :inv_id"
            ),
            {"qty": qty, "inv_id": existing.inventory_id},
        )
    else:
        db.execute(
            text(
                "INSERT INTO inventory "
                "(item_id, bin_id, warehouse_id, quantity_on_hand) "
                "VALUES (:iid, :bid, :wid, :qty)"
            ),
            {
                "iid": item_id, "bid": bin_id,
                "wid": dest_warehouse_id, "qty": qty,
            },
        )


@admin_bp.route(
    "/transfer-orders/<int:to_id>/approvals/<int:approval_id>/approve",
    methods=["POST"],
)
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def approve_transfer_order_approval(to_id, approval_id):
    # Lock the parent first in every lifecycle operation. This serializes
    # approve/reject/cancel/short-close and avoids opposite lock ordering.
    header = g.db.execute(
        text(
            "SELECT to_id, to_number, status, source_warehouse_id, "
            "       destination_warehouse_id, external_id, reservations_tracked "
            "  FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    denied = _check_transfer_order_warehouses(header.source_warehouse_id, header.destination_warehouse_id)
    if denied:
        return denied
    if not header.reservations_tracked:
        return jsonify({
            "error": "reservation_tracking_unavailable",
            "detail": "Legacy transfer order has no attributable per-line reservation records. Reconcile inventory before approval.",
        }), 409
    if header.status in (TO_STATUS_CANCELLED, TO_STATUS_CLOSED):
        return jsonify({
            "error": "transfer_order_not_approvable",
            "current_status": header.status,
        }), 409

    approval = g.db.execute(
        text(
            """
            SELECT to_approval_id, to_id, submitted_by, status,
                   approved_by, lines_snapshot, external_id
              FROM transfer_order_approvals
             WHERE to_approval_id = :aid AND to_id = :tid
             FOR UPDATE
            """
        ),
        {"aid": approval_id, "tid": to_id},
    ).fetchone()
    if not approval:
        return jsonify({"error": "Approval row not found"}), 404
    if approval.status != TO_APPROVAL_PENDING:
        return jsonify({
            "error": "approval_not_pending",
            "current_status": approval.status,
            "approved_by": approval.approved_by,
        }), 409

    if (_self_approval_blocked(g.db)
            and approval.submitted_by == g.current_user["username"]):
        return jsonify({
            "error": "self_approval_blocked",
            "submitted_by": approval.submitted_by,
            "detail": (
                "app_settings.transfer_order_block_self_approval is TRUE; "
                "a different admin must approve this submission."
            ),
        }), 403

    snapshot_lines = (approval.lines_snapshot or {}).get("lines", []) or []
    if not snapshot_lines:
        return jsonify({
            "error": "approval_snapshot_empty",
            "detail": "Approval row has no line snapshot; nothing to approve.",
        }), 422

    # Process lines in item_id ASC for deterministic inventory locking.
    snapshot_lines.sort(key=lambda r: r["item_id"])

    event_lines = []
    try:
        for snap in snapshot_lines:
            line_id = snap["to_line_id"]
            item_id = snap["item_id"]
            qty = int(snap["picked_in_snapshot"])
            if qty <= 0:
                continue
            _consume_line_reservations(g.db, line_id, qty)
            changed_line = g.db.execute(
                text(
                    """
                    UPDATE transfer_order_lines
                       SET approved_qty = approved_qty + :qty,
                           status = CASE
                               WHEN approved_qty + :qty = picked_qty
                                    AND picked_qty = committed_qty
                                    THEN 'APPROVED'
                               ELSE status
                           END
                     WHERE to_line_id = :lid AND to_id = :tid
                       AND approved_qty + :qty <= picked_qty
                       AND approved_qty + :qty <= committed_qty
                    RETURNING to_line_id
                    """
                ),
                {"qty": qty, "lid": line_id, "tid": to_id},
            ).fetchone()
            if not changed_line:
                raise ValueError(
                    f"approval snapshot exceeds current picked quantity for line={line_id}"
                )
            _credit_destination_inventory(
                g.db, item_id, header.destination_warehouse_id, qty,
            )
            item_external = g.db.execute(
                text("SELECT external_id FROM items WHERE item_id = :iid"),
                {"iid": item_id},
            ).fetchone()
            # Resolve canonical UUID to source-system external_id for the
            # outbound payload. Canonical UUID fallback when no upstream
            # mapping exists. See resolve_source_external_id docstring.
            item_source_external_id = (
                resolve_source_external_id(g.db, "item", item_external.external_id)
                or str(item_external.external_id)
            )
            event_lines.append({
                "item_external_id": item_source_external_id,
                "quantity": qty,
            })
    except ValueError as exc:
        g.db.rollback()
        return jsonify({"error": "approval_failed", "detail": str(exc)}), 409

    approved_at = datetime.now(timezone.utc)
    g.db.execute(
        text(
            """
            UPDATE transfer_order_approvals
               SET status = :st, approved_by = :by, approved_at = :at
             WHERE to_approval_id = :aid
            """
        ),
        {
            "st": TO_APPROVAL_APPROVED,
            "by": g.current_user["username"],
            "at": approved_at,
            "aid": approval_id,
        },
    )

    write_audit_log(
        g.db,
        action_type=ACTION_TO_APPROVED,
        entity_type="TO_APPROVAL",
        entity_id=approval_id,
        user_id=g.current_user["username"],
        warehouse_id=header.source_warehouse_id,
        details={
            "to_id": to_id,
            "to_number": header.to_number,
            "line_count": len(event_lines),
        },
    )

    closed = False
    if evaluate_to_closure(g.db, to_id):
        g.db.execute(
            text(
                "UPDATE transfer_orders "
                "   SET status = :st, updated_at = NOW() "
                " WHERE to_id = :tid"
            ),
            {"st": TO_STATUS_CLOSED, "tid": to_id},
        )
        write_audit_log(
            g.db,
            action_type=ACTION_TO_CLOSED,
            entity_type="TO",
            entity_id=to_id,
            user_id=g.current_user["username"],
            warehouse_id=header.source_warehouse_id,
            details={"to_number": header.to_number},
        )
        closed = True

    if event_lines:
        emit_event(
            g.db,
            event_type="inventorytransfer.completed",
            event_version=1,
            aggregate_type="inventory_transfer",
            aggregate_id=approval_id,
            aggregate_external_id=approval.external_id,
            warehouse_id=header.destination_warehouse_id,
            source_txn_id=getattr(g, "source_txn_id", None) or str(uuid.uuid4()),
            payload={
                "transfer_external_id": str(approval.external_id),
                "from_warehouse_id": header.source_warehouse_id,
                "to_warehouse_id": header.destination_warehouse_id,
                "lines": event_lines,
                "completed_at": approved_at.isoformat().replace(
                    "+00:00", "Z",
                ),
            },
        )
    g.db.commit()
    return jsonify({
        "to_approval_id": approval_id,
        "status": "APPROVED",
        "to_closed": closed,
        "line_count": len(event_lines),
    })


# ============================================================
# Admin reject (#293)
# ============================================================


@admin_bp.route(
    "/transfer-orders/<int:to_id>/approvals/<int:approval_id>/reject",
    methods=["POST"],
)
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def reject_transfer_order_approval(to_id, approval_id):
    body = request.get_json() or {}
    rejection_reason = (body.get("rejection_reason") or "").strip()[:1000]
    header = g.db.execute(
        text(
            "SELECT to_id, to_number, source_warehouse_id, destination_warehouse_id, "
            "       reservations_tracked "
            "  FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return jsonify({"error": "Transfer order not found"}), 404
    denied = _check_transfer_order_warehouses(header.source_warehouse_id, header.destination_warehouse_id)
    if denied:
        return denied
    if not header.reservations_tracked:
        return jsonify({
            "error": "reservation_tracking_unavailable",
            "detail": "Legacy transfer order has no attributable per-line reservation records. Reconcile inventory before rejection.",
        }), 409

    approval = g.db.execute(
        text(
            """
            SELECT to_approval_id, to_id, submitted_by, status,
                   lines_snapshot, external_id
              FROM transfer_order_approvals
             WHERE to_approval_id = :aid AND to_id = :tid
             FOR UPDATE
            """
        ),
        {"aid": approval_id, "tid": to_id},
    ).fetchone()
    if not approval:
        return jsonify({"error": "Approval row not found"}), 404
    if approval.status != TO_APPROVAL_PENDING:
        return jsonify({
            "error": "approval_not_pending",
            "current_status": approval.status,
        }), 409

    snapshot_lines = (approval.lines_snapshot or {}).get("lines", []) or []
    if not snapshot_lines:
        return jsonify({
            "error": "approval_snapshot_empty",
            "detail": "Approval row has no line snapshot; nothing to reject.",
        }), 422

    # Rejection leaves source inventory untouched and releases the
    # submitted pick result back to the picker. A fresh pick batch can
    # then be generated for committed_qty - approved_qty.
    for snapshot in snapshot_lines:
        line_id = int(snapshot["to_line_id"])
        rejected_qty = int(snapshot["picked_in_snapshot"])
        line = g.db.execute(
            text(
                "SELECT picked_qty, approved_qty, committed_qty "
                "  FROM transfer_order_lines "
                " WHERE to_line_id = :lid AND to_id = :tid FOR UPDATE"
            ),
            {"lid": line_id, "tid": to_id},
        ).fetchone()
        if not line or rejected_qty <= 0 or line.picked_qty - rejected_qty < line.approved_qty:
            g.db.rollback()
            return jsonify({
                "error": "approval_snapshot_mismatch",
                "to_line_id": line_id,
            }), 409
        restored_picked = line.picked_qty - rejected_qty
        restored_status = (
            TO_LINE_PICKED if restored_picked == line.committed_qty
            else TO_LINE_PARTIALLY_PICKED if restored_picked > 0
            else TO_LINE_PENDING
        )
        g.db.execute(
            text(
                "UPDATE transfer_order_lines "
                "   SET picked_qty = :picked, status = :status "
                " WHERE to_line_id = :lid"
            ),
            {"picked": restored_picked, "status": restored_status, "lid": line_id},
        )

    g.db.execute(
        text(
            "UPDATE transfer_orders SET status = :st, updated_at = NOW() "
            " WHERE to_id = :tid AND status NOT IN (:closed, :cancelled)"
        ),
        {
            "st": TO_STATUS_PARTIALLY_PICKED,
            "tid": to_id,
            "closed": TO_STATUS_CLOSED,
            "cancelled": TO_STATUS_CANCELLED,
        },
    )

    rejected_at = datetime.now(timezone.utc)
    g.db.execute(
        text(
            """
            UPDATE transfer_order_approvals
               SET status = :st, rejected_at = :at,
                   rejection_reason = :reason
             WHERE to_approval_id = :aid
            """
        ),
        {
            "st": TO_APPROVAL_REJECTED,
            "at": rejected_at,
            "reason": rejection_reason or None,
            "aid": approval_id,
        },
    )

    write_audit_log(
        g.db,
        action_type=ACTION_TO_REJECTED,
        entity_type="TO_APPROVAL",
        entity_id=approval_id,
        user_id=g.current_user["username"],
        warehouse_id=header.source_warehouse_id if header else None,
        details={
            "to_id": to_id,
            "to_number": header.to_number if header else None,
            "submitted_by": approval.submitted_by,
            "rejection_reason": rejection_reason or None,
        },
    )
    g.db.commit()
    return jsonify({
        "to_approval_id": approval_id,
        "status": "REJECTED",
    })
