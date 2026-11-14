"""Warehouse-scoped inventory adjustment endpoints."""

import math
import uuid

from flask import g, jsonify, request
from sqlalchemy import text

from constants import (
    ACTION_ADJUST, ADJ_APPROVED, ADJ_PENDING, ADJ_REJECTED,
    ADJ_REASON_CORRECTION,
)
from middleware.auth_middleware import require_admin_or_page_permission, require_auth, warehouse_scope_clause
from middleware.db import with_db
from routes.admin import admin_bp
from schemas.inventory_adjustments import DirectAdjustmentRequest, ReviewAdjustmentsRequest
from services.audit_service import write_audit_log
from services.inventory_service import add_inventory, set_inventory_quantity
from utils.validation import validate_body


def _adjustment_select():
    return """
        SELECT ia.adjustment_id, ia.item_id, ia.bin_id, ia.warehouse_id,
               ia.quantity_change, ia.reason_code, ia.reason_detail, ia.status,
               ia.adjusted_by, ia.adjusted_at, ia.cycle_count_id,
               i.sku, i.item_name, b.bin_code,
               ccl.expected_quantity, ccl.counted_quantity
        FROM inventory_adjustments ia
        JOIN items i ON i.item_id = ia.item_id
        JOIN bins b ON b.bin_id = ia.bin_id AND b.warehouse_id = ia.warehouse_id
        LEFT JOIN cycle_count_lines ccl
          ON ccl.count_id = ia.cycle_count_id AND ccl.item_id = ia.item_id
    """


def _serialize(row):
    return {
        "adjustment_id": row.adjustment_id,
        "item_id": row.item_id,
        "bin_id": row.bin_id,
        "warehouse_id": row.warehouse_id,
        "quantity_change": row.quantity_change,
        "reason_code": row.reason_code,
        "reason_detail": row.reason_detail,
        "status": row.status,
        "adjusted_by": row.adjusted_by,
        "adjusted_at": row.adjusted_at.isoformat() if row.adjusted_at else None,
        "cycle_count_id": row.cycle_count_id,
        "sku": row.sku,
        "item_name": row.item_name,
        "bin_code": row.bin_code,
        "expected_quantity": row.expected_quantity,
        "counted_quantity": row.counted_quantity,
    }


def _apply_inventory_delta(db, item_id, bin_id, warehouse_id, delta):
    """Apply a signed adjustment while serializing updates to this item/bin."""
    db.execute(
        text("SELECT pg_advisory_xact_lock(:item_id, :bin_id)"),
        {"item_id": item_id, "bin_id": bin_id},
    )
    if delta > 0:
        add_inventory(db, item_id, bin_id, warehouse_id, delta)
        return

    rows = db.execute(
        text("""
            SELECT inventory_id, quantity_on_hand, quantity_allocated
            FROM inventory
            WHERE item_id = :item_id AND bin_id = :bin_id
            ORDER BY inventory_id
            FOR UPDATE
        """),
        {"item_id": item_id, "bin_id": bin_id},
    ).fetchall()
    unallocated = sum(row.quantity_on_hand - row.quantity_allocated for row in rows)
    required = -delta
    if unallocated < required:
        raise ValueError(
            f"Insufficient unallocated inventory: requested {required}, available {unallocated}"
        )

    remaining = required
    for row in rows:
        if remaining <= 0:
            break
        free_quantity = max(row.quantity_on_hand - row.quantity_allocated, 0)
        take = min(free_quantity, remaining)
        if take:
            set_inventory_quantity(db, row.inventory_id, row.quantity_on_hand - take)
            remaining -= take


@admin_bp.route("/adjustments/list", methods=["GET"])
@require_auth
@require_admin_or_page_permission("adjustments")
@with_db
def list_adjustments():
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "50"))
        warehouse_arg = request.args.get("warehouse_id")
        warehouse_id = int(warehouse_arg) if warehouse_arg is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "page, per_page and warehouse_id must be integers"}), 400
    if page < 1 or not 1 <= per_page <= 1000:
        return jsonify({"error": "page must be positive and per_page between 1 and 1000"}), 400
    if warehouse_id is not None and warehouse_id <= 0:
        return jsonify({"error": "warehouse_id must be positive"}), 400

    record_scope, record_params = warehouse_scope_clause("ia.warehouse_id")
    bin_scope, bin_params = warehouse_scope_clause("b.warehouse_id")
    params = {**record_params, **bin_params}
    where = ["1 = 1"]
    if record_scope:
        where.append(record_scope.removeprefix("AND ").strip())
    if bin_scope:
        where.append(bin_scope.removeprefix("AND ").strip())
    if warehouse_id is not None:
        where.append("ia.warehouse_id = :warehouse_id")
        params["warehouse_id"] = warehouse_id
    status = (request.args.get("status") or "").upper()
    if status:
        if status not in (ADJ_PENDING, ADJ_APPROVED, ADJ_REJECTED):
            return jsonify({"error": "status must be PENDING, APPROVED or REJECTED"}), 400
        where.append("ia.status = :status")
        params["status"] = status
    where_sql = "WHERE " + " AND ".join(where)
    total = g.db.execute(
        text("SELECT COUNT(*) FROM inventory_adjustments ia "
             "JOIN bins b ON b.bin_id = ia.bin_id AND b.warehouse_id = ia.warehouse_id "
             + where_sql), params
    ).scalar()
    pages = max(1, math.ceil(total / per_page))
    rows = g.db.execute(
        text(_adjustment_select() + " " + where_sql +
             " ORDER BY ia.adjusted_at DESC, ia.adjustment_id DESC LIMIT :limit OFFSET :offset"),
        {**params, "limit": per_page, "offset": (page - 1) * per_page},
    ).fetchall()
    return jsonify({
        "adjustments": [_serialize(row) for row in rows],
        "total": total, "page": page, "per_page": per_page, "pages": pages,
    })


@admin_bp.route("/adjustments/pending", methods=["GET"])
@require_auth
@require_admin_or_page_permission("adjustments")
@with_db
def list_pending_adjustments():
    # Keep the same filtering, pagination and warehouse-scope semantics.
    record_scope, record_params = warehouse_scope_clause("ia.warehouse_id")
    bin_scope, bin_params = warehouse_scope_clause("b.warehouse_id")
    params = {**record_params, **bin_params, "status": ADJ_PENDING}
    where = ["ia.status = :status"]
    if record_scope:
        where.append(record_scope.removeprefix("AND ").strip())
    if bin_scope:
        where.append(bin_scope.removeprefix("AND ").strip())
    warehouse_arg = request.args.get("warehouse_id")
    if warehouse_arg is not None:
        try:
            warehouse_id = int(warehouse_arg)
        except ValueError:
            return jsonify({"error": "warehouse_id must be an integer"}), 400
        if warehouse_id <= 0:
            return jsonify({"error": "warehouse_id must be positive"}), 400
        where.append("ia.warehouse_id = :warehouse_id")
        params["warehouse_id"] = warehouse_id
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "50"))
    except ValueError:
        return jsonify({"error": "page and per_page must be integers"}), 400
    if page < 1 or not 1 <= per_page <= 1000:
        return jsonify({"error": "invalid pagination"}), 400
    where_sql = "WHERE " + " AND ".join(where)
    total = g.db.execute(
        text("SELECT COUNT(*) FROM inventory_adjustments ia "
             "JOIN bins b ON b.bin_id = ia.bin_id AND b.warehouse_id = ia.warehouse_id "
             + where_sql), params
    ).scalar()
    rows = g.db.execute(
        text(_adjustment_select() + " " + where_sql +
             " ORDER BY ia.adjusted_at, ia.adjustment_id LIMIT :limit OFFSET :offset"),
        {**params, "limit": per_page, "offset": (page - 1) * per_page},
    ).fetchall()
    return jsonify({
        "adjustments": [_serialize(row) for row in rows],
        "total": total, "page": page, "per_page": per_page,
        "pages": max(1, math.ceil(total / per_page)),
    })


@admin_bp.route("/adjustments/direct", methods=["POST"])
@require_auth
@require_admin_or_page_permission("adjustments")
@validate_body(DirectAdjustmentRequest)
@with_db
def create_direct_adjustment(validated):
    data = validated.model_dump()
    # Resolve warehouse from the bin itself and apply the scope in SQL.
    # The client-supplied warehouse_id is only a consistency assertion.
    scope, scope_params = warehouse_scope_clause("b.warehouse_id")
    bin_row = g.db.execute(
        text("SELECT b.bin_id, b.warehouse_id, b.bin_code FROM bins b "
             "WHERE b.bin_id = :bin_id " + scope),
        {"bin_id": data["bin_id"], **scope_params},
    ).fetchone()
    if not bin_row:
        return jsonify({"error": "Bin not found"}), 404
    if bin_row.warehouse_id != data["warehouse_id"]:
        return jsonify({"error": "Bin does not belong to the specified warehouse"}), 400
    item = g.db.execute(
        text("SELECT item_id, sku FROM items WHERE item_id = :item_id"),
        {"item_id": data["item_id"]},
    ).fetchone()
    if not item:
        return jsonify({"error": "Item not found"}), 404

    delta = data["quantity"] if data["adjustment_type"] == "ADD" else -data["quantity"]
    try:
        _apply_inventory_delta(
            g.db, data["item_id"], data["bin_id"], bin_row.warehouse_id, delta
        )
    except ValueError as exc:
        g.db.rollback()
        return jsonify({"error": str(exc)}), 409

    row = g.db.execute(
        text("""
            INSERT INTO inventory_adjustments
                (item_id, bin_id, warehouse_id, quantity_change, reason_code,
                 reason_detail, status, adjusted_by, external_id)
            VALUES (:item_id, :bin_id, :warehouse_id, :delta, :reason_code,
                    :reason, :status, :username, :external_id)
            RETURNING adjustment_id, adjusted_at
        """),
        {
            "item_id": data["item_id"], "bin_id": data["bin_id"],
            "warehouse_id": bin_row.warehouse_id, "delta": delta,
            "reason_code": ADJ_REASON_CORRECTION, "reason": data["reason"].strip(),
            "status": ADJ_APPROVED, "username": g.current_user["username"],
            "external_id": str(uuid.uuid4()),
        },
    ).fetchone()
    write_audit_log(
        g.db, ACTION_ADJUST, "ITEM", data["item_id"],
        user_id=g.current_user["user_id"], warehouse_id=bin_row.warehouse_id,
        details={"adjustment_id": row.adjustment_id, "bin_id": data["bin_id"],
                 "quantity_change": delta, "reason": data["reason"].strip(),
                 "source": "DIRECT"},
    )
    g.db.commit()
    return jsonify({
        "message": "Adjustment applied", "adjustment_id": row.adjustment_id,
        "status": ADJ_APPROVED, "quantity_change": delta,
        "adjusted_at": row.adjusted_at.isoformat() if row.adjusted_at else None,
    }), 201


@admin_bp.route("/adjustments/review", methods=["POST"])
@require_auth
@require_admin_or_page_permission("adjustments")
@validate_body(ReviewAdjustmentsRequest)
@with_db
def review_adjustments(validated):
    decisions = validated.model_dump()["decisions"]
    ids = [decision["adjustment_id"] for decision in decisions]
    if len(ids) != len(set(ids)):
        return jsonify({"error": "Duplicate adjustment_id in decisions"}), 400

    record_scope, record_params = warehouse_scope_clause("ia.warehouse_id")
    bin_scope, bin_params = warehouse_scope_clause("b.warehouse_id")
    rows = g.db.execute(
        text("""
            SELECT ia.adjustment_id, ia.item_id, ia.bin_id, ia.warehouse_id,
                   b.warehouse_id AS resolved_warehouse_id,
                   ia.quantity_change, ia.reason_code, ia.reason_detail, ia.status
            FROM inventory_adjustments ia
            JOIN bins b ON b.bin_id = ia.bin_id AND b.warehouse_id = ia.warehouse_id
            WHERE ia.adjustment_id = ANY(:ids)
            """ + record_scope + bin_scope
            + " ORDER BY ia.adjustment_id FOR UPDATE OF ia, b"),
        {"ids": ids, **record_params, **bin_params},
    ).fetchall()
    by_id = {row.adjustment_id: row for row in rows}
    # A missing ID and an out-of-scope ID are intentionally indistinguishable.
    if len(by_id) != len(ids):
        g.db.rollback()
        return jsonify({"error": "One or more adjustments were not found"}), 404
    closed = [row.adjustment_id for row in rows if row.status != ADJ_PENDING]
    if closed:
        g.db.rollback()
        return jsonify({
            "error": "One or more adjustments are already closed",
            "adjustment_ids": closed,
        }), 409

    for decision in decisions:
        row = by_id[decision["adjustment_id"]]
        if decision["action"] == "approve":
            try:
                _apply_inventory_delta(
                    g.db, row.item_id, row.bin_id, row.resolved_warehouse_id, row.quantity_change
                )
            except ValueError as exc:
                g.db.rollback()
                return jsonify({"error": str(exc), "adjustment_id": row.adjustment_id}), 409
            new_status = ADJ_APPROVED
        else:
            new_status = ADJ_REJECTED
        updated = g.db.execute(
            text("UPDATE inventory_adjustments SET status = :status "
                 "WHERE adjustment_id = :adjustment_id AND status = :pending"),
            {"status": new_status, "adjustment_id": row.adjustment_id, "pending": ADJ_PENDING},
        )
        if updated.rowcount != 1:
            g.db.rollback()
            return jsonify({"error": "Adjustment was already reviewed"}), 409
        write_audit_log(
            g.db, ACTION_ADJUST, "ITEM", row.item_id,
            user_id=g.current_user["user_id"], warehouse_id=row.resolved_warehouse_id,
            details={"adjustment_id": row.adjustment_id, "decision": decision["action"],
                     "quantity_change": row.quantity_change},
        )
    g.db.commit()
    return jsonify({"message": "Adjustments reviewed", "reviewed": len(decisions)})
