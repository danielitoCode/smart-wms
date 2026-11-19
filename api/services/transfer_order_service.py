"""Service-level helpers for warehouse-to-warehouse transfer orders
(v1.8.0 #290).

Lives alongside the picking + cycle-count services since the TO
lifecycle reuses both: pick_tasks dispatch via the to_id discriminator
(mig 049), and the admin approval pattern modelled on cycle count
adjustments. Routes orchestrate the lifecycle; this module owns the
TO number generator, the state-machine validation helpers, and the
inventory-locking pattern shared by import + approval.

State machines (plan section 4.1):

  HEADER  OPEN -> PARTIALLY_PICKED -> AWAITING_APPROVAL -> APPROVED ->
                  CLOSED  ;  OPEN / PARTIALLY_PICKED -> CANCELLED.
  LINE    PENDING -> PARTIALLY_PICKED -> PICKED -> APPROVED  ;
          PENDING / PARTIALLY_PICKED -> SHORT_CLOSED.
  APPRVL  PENDING -> APPROVED  ;  PENDING -> REJECTED.

Every state-changing route writes one ACTION_TO_* audit_log row via
api.services.audit_service.write_audit_log so the V-025 chain
extends through the lifecycle.
"""

from __future__ import annotations

from datetime import datetime
from typing import Iterable, Optional


# ============================================================
# TO number generator
# ============================================================
#
# Mirrors picking_service.py:49 BATCH-{YYYYMMDD-HHMMSS} but at
# millisecond precision so a same-second burst from the CSV importer
# does not collide on the UNIQUE (transfer_orders.to_number)
# constraint. The route retries once with a fresh timestamp before
# surfacing 500; the second collision in 1 ms is rare enough that one
# retry is enough.

TO_NUMBER_PREFIX = "TO-"


def generate_to_number(now: Optional[datetime] = None) -> str:
    """Format: TO-{YYYYMMDDHHMMSSmmm}. Millisecond zero-padded."""
    now = now or datetime.now()
    return (
        f"{TO_NUMBER_PREFIX}"
        f"{now.strftime('%Y%m%d%H%M%S')}"
        f"{now.microsecond // 1000:03d}"
    )


# ============================================================
# State machine validation
# ============================================================

# Header
TO_STATUS_OPEN              = "OPEN"
TO_STATUS_PARTIALLY_PICKED  = "PARTIALLY_PICKED"
TO_STATUS_AWAITING_APPROVAL = "AWAITING_APPROVAL"
TO_STATUS_APPROVED          = "APPROVED"
TO_STATUS_CLOSED            = "CLOSED"
TO_STATUS_CANCELLED         = "CANCELLED"

_HEADER_TRANSITIONS = {
    TO_STATUS_OPEN: {TO_STATUS_PARTIALLY_PICKED, TO_STATUS_CANCELLED},
    TO_STATUS_PARTIALLY_PICKED: {
        TO_STATUS_PARTIALLY_PICKED,  # picker keeps picking
        TO_STATUS_AWAITING_APPROVAL,
        TO_STATUS_CANCELLED,
    },
    TO_STATUS_AWAITING_APPROVAL: {TO_STATUS_APPROVED, TO_STATUS_PARTIALLY_PICKED},
    TO_STATUS_APPROVED: {TO_STATUS_CLOSED, TO_STATUS_PARTIALLY_PICKED},
    TO_STATUS_CLOSED: set(),
    TO_STATUS_CANCELLED: set(),
}

# Line
TO_LINE_PENDING           = "PENDING"
TO_LINE_PARTIALLY_PICKED  = "PARTIALLY_PICKED"
TO_LINE_PICKED            = "PICKED"
TO_LINE_APPROVED          = "APPROVED"
TO_LINE_SHORT_CLOSED      = "SHORT_CLOSED"

_LINE_TRANSITIONS = {
    TO_LINE_PENDING: {TO_LINE_PARTIALLY_PICKED, TO_LINE_SHORT_CLOSED},
    TO_LINE_PARTIALLY_PICKED: {
        TO_LINE_PARTIALLY_PICKED,
        TO_LINE_PICKED,
        TO_LINE_SHORT_CLOSED,
    },
    TO_LINE_PICKED: {TO_LINE_APPROVED, TO_LINE_SHORT_CLOSED},
    TO_LINE_APPROVED: set(),
    TO_LINE_SHORT_CLOSED: set(),
}

# Approval
TO_APPROVAL_PENDING  = "PENDING"
TO_APPROVAL_APPROVED = "APPROVED"
TO_APPROVAL_REJECTED = "REJECTED"

_APPROVAL_TRANSITIONS = {
    TO_APPROVAL_PENDING: {TO_APPROVAL_APPROVED, TO_APPROVAL_REJECTED},
    TO_APPROVAL_APPROVED: set(),
    TO_APPROVAL_REJECTED: set(),
}


def _validate_transition(machine: dict, current: str, target: str) -> None:
    if current not in machine:
        raise ValueError(f"unknown current state: {current!r}")
    allowed = machine[current]
    if target not in allowed:
        raise ValueError(
            f"invalid transition {current!r} -> {target!r}; allowed: "
            f"{sorted(allowed)}"
        )


def validate_header_transition(current: str, target: str) -> None:
    _validate_transition(_HEADER_TRANSITIONS, current, target)


def validate_line_transition(current: str, target: str) -> None:
    _validate_transition(_LINE_TRANSITIONS, current, target)


def validate_approval_transition(current: str, target: str) -> None:
    _validate_transition(_APPROVAL_TRANSITIONS, current, target)


# ============================================================
# Closure derivation
# ============================================================


def is_header_closeable(line_states: Iterable[tuple]) -> bool:
    """Header transitions to CLOSED when every line has either
    approved_qty == picked_qty (line state = APPROVED) or status
    SHORT_CLOSED, AND no PENDING approval rows remain. The caller
    passes (state, approved_qty, picked_qty) tuples; the boolean
    answer is the closure decision.
    """
    for state, approved_qty, picked_qty in line_states:
        if state == TO_LINE_SHORT_CLOSED:
            continue
        if state == TO_LINE_APPROVED and approved_qty == picked_qty:
            continue
        return False
    return True


# ============================================================
# Pick-side helpers
# ============================================================


class TransferOrderSubmissionConflict(Exception):
    """A completed picker batch cannot be safely snapshotted for approval."""


class OverPickAttempt(Exception):
    """picked_qty + delta would exceed committed_qty. The WHERE clause
    guard on update_transfer_order_line_picked is the atomic safety net
    so two concurrent pickers can't both push past the cap; the route
    surfaces 409 to the second picker."""


def update_transfer_order_line_picked(db, to_line_id: int, delta: int) -> dict:
    """Atomically bump transfer_order_lines.picked_qty by ``delta`` and
    flip status accordingly.

    No FOR UPDATE: the WHERE clause encodes the cap (picked_qty + delta
    <= committed_qty) so two concurrent pickers serialize at the row
    lock taken by the UPDATE itself. The second picker's UPDATE
    returns zero rows if the first one already filled the line; the
    helper raises OverPickAttempt and the route surfaces 409.

    Returns {"picked_qty", "committed_qty", "status"} on success.
    """
    if delta <= 0:
        raise ValueError(f"delta must be > 0, got {delta!r}")
    from sqlalchemy import text  # local import to keep top of file lib-free

    tracking = db.execute(
        text(
            """
            SELECT o.reservations_tracked, tol.committed_qty, tol.approved_qty,
                   COALESCE(SUM(r.reserved_qty), 0) AS reserved_qty,
                   COALESCE(SUM(r.consumed_qty), 0) AS consumed_qty,
                   COALESCE(SUM(r.released_qty), 0) AS released_qty
              FROM transfer_order_lines tol
              JOIN transfer_orders o ON o.to_id = tol.to_id
              LEFT JOIN transfer_order_reservations r ON r.to_line_id = tol.to_line_id
             WHERE tol.to_line_id = :lid
             GROUP BY tol.to_line_id, o.reservations_tracked,
                      tol.committed_qty, tol.approved_qty
            """
        ),
        {"lid": to_line_id},
    ).fetchone()
    if not tracking or not tracking.reservations_tracked:
        raise OverPickAttempt(
            f"transfer_order_lines.to_line_id={to_line_id}: exact inventory reservations are unavailable"
        )
    expected_remaining = (
        tracking.committed_qty - tracking.approved_qty - tracking.released_qty
    )
    actual_remaining = (
        tracking.reserved_qty - tracking.consumed_qty - tracking.released_qty
    )
    if (
        tracking.reserved_qty != tracking.committed_qty
        or tracking.consumed_qty != tracking.approved_qty
        or expected_remaining < 0
        or actual_remaining != expected_remaining
    ):
        raise OverPickAttempt(
            f"transfer_order_lines.to_line_id={to_line_id}: reservation ledger does not match committed/approved quantities"
        )

    pending_approval = db.execute(
        text(
            """
            SELECT a.to_approval_id
              FROM transfer_order_approvals a
              JOIN transfer_order_lines tol ON tol.to_id = a.to_id
             WHERE tol.to_line_id = :lid AND a.status = 'PENDING'
             LIMIT 1
            """
        ),
        {"lid": to_line_id},
    ).fetchone()
    if pending_approval:
        raise OverPickAttempt(
            f"transfer_order_lines.to_line_id={to_line_id}: a picker submission "
            f"is awaiting approval (approval_id={pending_approval.to_approval_id})"
        )

    row = db.execute(
        text(
            """
            UPDATE transfer_order_lines
               SET picked_qty = picked_qty + :delta,
                   status = CASE
                       WHEN picked_qty + :delta = committed_qty
                            THEN :picked_state
                       ELSE :partial_state
                   END
             WHERE to_line_id = :lid
               AND picked_qty + :delta <= committed_qty
               AND status IN (:pending, :partial_state)
             RETURNING picked_qty, committed_qty, status
            """
        ),
        {
            "delta": delta,
            "lid": to_line_id,
            "picked_state": TO_LINE_PICKED,
            "partial_state": TO_LINE_PARTIALLY_PICKED,
            "pending": TO_LINE_PENDING,
        },
    ).fetchone()
    if row is None:
        raise OverPickAttempt(
            f"transfer_order_lines.to_line_id={to_line_id}: pick of "
            f"+{delta} would exceed committed_qty or line is in a "
            f"non-pickable state"
        )
    return {
        "picked_qty": row.picked_qty,
        "committed_qty": row.committed_qty,
        "status": row.status,
    }


def maybe_promote_header_to_awaiting_approval(db, to_id: int) -> bool:
    """When every TO line has reached PICKED or SHORT_CLOSED, the
    header advances to AWAITING_APPROVAL. Called after confirm_pick
    + after picker submission. Returns True when the header was
    actually advanced (so the caller can write the status-flip
    audit row), False when the TO is still mid-pick.
    """
    from sqlalchemy import text

    counts = db.execute(
        text(
            """
            SELECT
              COUNT(*) FILTER (WHERE status IN (:pending, :partial)) AS open,
              COUNT(*) FILTER (WHERE status = :picked) AS picked_full,
              COUNT(*) AS total
              FROM transfer_order_lines
             WHERE to_id = :tid
            """
        ),
        {
            "tid": to_id,
            "pending": TO_LINE_PENDING,
            "partial": TO_LINE_PARTIALLY_PICKED,
            "picked": TO_LINE_PICKED,
        },
    ).fetchone()
    if counts.total == 0 or counts.open > 0 or counts.picked_full == 0:
        return False
    # Every line is either PICKED, APPROVED, or SHORT_CLOSED. The
    # header should be AWAITING_APPROVAL unless it is already there or
    # already past it (PARTIALLY_PICKED -> AWAITING_APPROVAL is the
    # only forward transition the picker triggers).
    header_row = db.execute(
        text(
            "SELECT status FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if header_row is None or header_row.status == TO_STATUS_AWAITING_APPROVAL:
        return False
    if header_row.status not in (TO_STATUS_OPEN, TO_STATUS_PARTIALLY_PICKED):
        return False
    db.execute(
        text(
            "UPDATE transfer_orders "
            "   SET status = :st, updated_at = NOW() "
            " WHERE to_id = :tid"
        ),
        {"st": TO_STATUS_AWAITING_APPROVAL, "tid": to_id},
    )
    return True


def maybe_promote_header_to_partially_picked(db, to_id: int) -> bool:
    """First pick on an OPEN TO advances the header to
    PARTIALLY_PICKED. Returns True when the row actually flipped."""
    from sqlalchemy import text

    row = db.execute(
        text(
            "UPDATE transfer_orders "
            "   SET status = :new_st, updated_at = NOW() "
            " WHERE to_id = :tid AND status = :open "
            " RETURNING status"
        ),
        {
            "tid": to_id,
            "new_st": TO_STATUS_PARTIALLY_PICKED,
            "open": TO_STATUS_OPEN,
        },
    ).fetchone()
    return row is not None


def submit_picks(db, to_id: int, username: str) -> dict:
    """Batch the picks taken since the last submit into a
    transfer_order_approvals row and advance the header.

    Shared by the picker submit route and by complete_batch, which
    auto-submits when a TO pick batch finishes (batch
    completion used to leave the TO stranded at PARTIALLY_PICKED).
    Does NOT commit - the caller owns the transaction. Inventory does
    not move at submit time; that happens at approval.

    Returns a result dict the caller maps to its own surface:
      {"ok": False, "reason": "not_found"}
      {"ok": False, "reason": "invalid_status", "current_status": <s>}
      {"ok": False, "reason": "nothing_picked"}
      {"ok": True, "to_approval_id": <id>, "to_status": <s>,
       "line_count": <n>}
    """
    import json
    import uuid

    from sqlalchemy import text

    from constants import ACTION_TO_SUBMITTED
    from services.audit_service import write_audit_log

    header = db.execute(
        text(
            "SELECT to_id, to_number, status, source_warehouse_id, reservations_tracked "
            "  FROM transfer_orders WHERE to_id = :tid FOR UPDATE"
        ),
        {"tid": to_id},
    ).fetchone()
    if not header:
        return {"ok": False, "reason": "not_found"}
    if not header.reservations_tracked:
        return {"ok": False, "reason": "reservation_tracking_unavailable"}
    if header.status not in (
        TO_STATUS_PARTIALLY_PICKED, TO_STATUS_AWAITING_APPROVAL,
    ):
        return {
            "ok": False,
            "reason": "invalid_status",
            "current_status": header.status,
        }

    # Lines with new picks since the last submit: picked_qty exceeds
    # what has already been APPROVED on this line. Snapshots the delta
    # so the approval row is independent of subsequent picks.
    lines = db.execute(
        text(
            """
            SELECT to_line_id, item_id, picked_qty, approved_qty,
                   committed_qty, status
              FROM transfer_order_lines
             WHERE to_id = :tid AND picked_qty > approved_qty
             ORDER BY line_number
            """
        ),
        {"tid": to_id},
    ).fetchall()
    if not lines:
        return {"ok": False, "reason": "nothing_picked"}

    pending_tasks = db.execute(
        text("SELECT COUNT(*) FROM pick_tasks WHERE to_id = :tid AND status = 'PENDING'"),
        {"tid": to_id},
    ).scalar()
    if pending_tasks:
        return {"ok": False, "reason": "pending_pick_tasks_exist", "pending_tasks": pending_tasks}

    pending_approval = db.execute(
        text(
            "SELECT to_approval_id FROM transfer_order_approvals "
            " WHERE to_id = :tid AND status = 'PENDING' "
            " ORDER BY to_approval_id LIMIT 1"
        ),
        {"tid": to_id},
    ).fetchone()
    if pending_approval:
        return {
            "ok": False,
            "reason": "pending_approval_exists",
            "to_approval_id": pending_approval.to_approval_id,
        }

    snapshot_lines = []
    for line in lines:
        tasks = db.execute(
            text(
                """
                SELECT pick_task_id, item_id, inventory_id, bin_id,
                       quantity_picked, quantity_approved
                  FROM pick_tasks
                 WHERE to_id = :tid AND to_line_id = :lid
                   AND status = 'PICKED'
                   AND quantity_picked > quantity_approved
                 ORDER BY inventory_id, pick_task_id
                 FOR UPDATE
                """
            ),
            {"tid": to_id, "lid": line.to_line_id},
        ).fetchall()
        task_snapshot = []
        allocation_totals = {}
        task_total = 0
        for task in tasks:
            delta = task.quantity_picked - task.quantity_approved
            if task.item_id != line.item_id or task.inventory_id is None or delta <= 0:
                return {"ok": False, "reason": "reservation_task_mismatch"}
            task_total += delta
            task_snapshot.append({
                "pick_task_id": task.pick_task_id,
                "inventory_id": task.inventory_id,
                "bin_id": task.bin_id,
                "picked_in_snapshot": delta,
            })
            current = allocation_totals.setdefault(
                task.inventory_id,
                {"inventory_id": task.inventory_id, "bin_id": task.bin_id, "quantity": 0},
            )
            if current["bin_id"] != task.bin_id:
                return {"ok": False, "reason": "reservation_task_mismatch"}
            current["quantity"] += delta

        expected_delta = line.picked_qty - line.approved_qty
        if task_total != expected_delta or not task_snapshot:
            return {"ok": False, "reason": "reservation_task_mismatch"}
        snapshot_lines.append({
            "to_line_id": line.to_line_id,
            "item_id": line.item_id,
            "picked_in_snapshot": expected_delta,
            "tasks": task_snapshot,
            "inventory_allocations": list(allocation_totals.values()),
        })
    approval_row = db.execute(
        text(
            """
            INSERT INTO transfer_order_approvals
                (to_id, submitted_by, lines_snapshot, external_id)
            VALUES (:tid, :sub, CAST(:snap AS JSONB), :ext)
            RETURNING to_approval_id
            """
        ),
        {
            "tid": to_id,
            "sub": username,
            "snap": json.dumps({"lines": snapshot_lines}),
            "ext": str(uuid.uuid4()),
        },
    ).fetchone()
    approval_id = approval_row.to_approval_id

    # Header status: AWAITING_APPROVAL when every line is fully picked
    # or short-closed; otherwise PARTIALLY_PICKED stays.
    open_lines = db.execute(
        text(
            "SELECT COUNT(*) FROM transfer_order_lines "
            " WHERE to_id = :tid "
            "   AND status IN (:pending, :partial)"
        ),
        {
            "tid": to_id,
            "pending": TO_LINE_PENDING,
            "partial": TO_LINE_PARTIALLY_PICKED,
        },
    ).scalar()
    new_status = (
        TO_STATUS_AWAITING_APPROVAL if open_lines == 0
        else TO_STATUS_PARTIALLY_PICKED
    )
    if header.status != new_status:
        db.execute(
            text(
                "UPDATE transfer_orders SET status = :st, updated_at = NOW() "
                " WHERE to_id = :tid"
            ),
            {"st": new_status, "tid": to_id},
        )

    write_audit_log(
        db,
        action_type=ACTION_TO_SUBMITTED,
        entity_type="TO",
        entity_id=to_id,
        user_id=username,
        warehouse_id=header.source_warehouse_id,
        details={
            "to_number": header.to_number,
            "to_approval_id": approval_id,
            "line_count": len(snapshot_lines),
        },
    )
    return {
        "ok": True,
        "to_approval_id": approval_id,
        "to_status": new_status,
        "line_count": len(snapshot_lines),
    }


# ============================================================
# Closure derivation against the live row state
# ============================================================


def evaluate_to_closure(db, to_id: int) -> bool:
    """Return True when the TO meets every closure condition: every
    line is APPROVED with approved_qty == picked_qty (or
    SHORT_CLOSED) AND no PENDING approvals remain. Caller flips the
    header to CLOSED and writes the audit row when this returns True."""
    from sqlalchemy import text

    line_states = db.execute(
        text(
            "SELECT status, approved_qty, picked_qty "
            "  FROM transfer_order_lines WHERE to_id = :tid"
        ),
        {"tid": to_id},
    ).fetchall()
    if not line_states:
        return False
    if not is_header_closeable(
        [(r.status, r.approved_qty, r.picked_qty) for r in line_states],
    ):
        return False
    pending = db.execute(
        text(
            "SELECT COUNT(*) FROM transfer_order_approvals "
            " WHERE to_id = :tid AND status = 'PENDING'"
        ),
        {"tid": to_id},
    ).scalar()
    return pending == 0
