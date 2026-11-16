"""Read-only admin observability for accepted inbound records."""
from datetime import datetime
import re

from flask import jsonify, request, g
from middleware.auth_middleware import require_admin_or_page_permission, require_auth
from middleware.db import with_db
from routes.admin import admin_bp
from sqlalchemy import text

_INBOUND_TABLES = {
    "sales_orders": "inbound_sales_orders",
    "items": "inbound_items",
    "customers": "inbound_customers",
    "vendors": "inbound_vendors",
    "purchase_orders": "inbound_purchase_orders",
}
_VALID_STATUSES = {"applied", "superseded"}
_SENSITIVE_KEY = re.compile(
    r"(password|passwd|secret|token|authorization|api[_-]?key|email|e_mail|"
    r"phone|mobile|address|street|postal|zip|ssn|tax[_-]?id|birth|"
    r"account[_-]?number|card[_-]?number|first[_-]?name|last[_-]?name|"
    r"full[_-]?name|recipient|(^|[_-])name([_-]|$))",
    re.IGNORECASE,
)


def _activity_union_sql(resource):
    """Interpolate table names only from the static allowlist."""
    resources = [(resource, _INBOUND_TABLES[resource])] if resource else list(_INBOUND_TABLES.items())
    return " UNION ALL ".join(
        f"SELECT '{key}' AS resource, inbound_id, source_system, external_id, "
        "external_version, canonical_id, received_at, status, superseded_at, "
        f"ingested_via_token_id FROM {table}"
        for key, table in resources
    )


def _safe_payload(value):
    """Redact credentials and direct-contact/address fields recursively."""
    if isinstance(value, dict):
        return {
            key: "[REDACTED]" if _SENSITIVE_KEY.search(str(key)) else _safe_payload(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [_safe_payload(item) for item in value]
    return value


def _parse_timestamp(value, name):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        raise ValueError(f"invalid_{name}")


@admin_bp.route("/inbound/activity", methods=["GET"])
@require_auth
@require_admin_or_page_permission("inbound")
@with_db
def list_inbound_activity():
    """List accepted staging rows with offset pagination and exact filters.

    Failed requests are not persisted in inbound staging tables; this
    endpoint therefore reports applied/superseded records only.
    """
    source_system = request.args.get("source_system") or None
    resource = request.args.get("resource") or None
    status = request.args.get("status") or None
    if resource is not None and resource not in _INBOUND_TABLES:
        return jsonify({"error": "unknown_resource", "valid": sorted(_INBOUND_TABLES)}), 400
    if status is not None and status not in _VALID_STATUSES:
        return jsonify({"error": "unknown_status", "valid": sorted(_VALID_STATUSES)}), 400
    try:
        page = int(request.args.get("page", "1"))
        per_page = max(1, min(500, int(request.args.get("per_page", request.args.get("limit", "100")))))
        since = _parse_timestamp(request.args.get("since"), "since")
        until = _parse_timestamp(request.args.get("until"), "until")
    except ValueError as exc:
        return jsonify({"error": str(exc) or "invalid_pagination"}), 400
    if page < 1:
        return jsonify({"error": "invalid_page"}), 400
    if since and until and since > until:
        return jsonify({"error": "invalid_date_range"}), 400

    union_sql = _activity_union_sql(resource)
    clauses = []
    params = {"limit": per_page, "offset": (page - 1) * per_page}
    if source_system:
        clauses.append("source_system = :source_system")
        params["source_system"] = source_system
    if status:
        clauses.append("status = :status")
        params["status"] = status
    if since:
        clauses.append("received_at >= :since")
        params["since"] = since
    if until:
        clauses.append("received_at <= :until")
        params["until"] = until
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    count_params = {key: value for key, value in params.items() if key not in ("limit", "offset")}
    total = g.db.execute(
        text(f"SELECT COUNT(*) FROM ({union_sql}) AS activity {where}"), count_params
    ).scalar() or 0
    rows = g.db.execute(
        text(
            "SELECT resource, inbound_id, source_system, external_id, external_version, "
            "canonical_id, received_at, status, superseded_at, ingested_via_token_id "
            f"FROM ({union_sql}) AS activity {where} "
            "ORDER BY received_at DESC, resource ASC, inbound_id DESC LIMIT :limit OFFSET :offset"
        ),
        params,
    ).fetchall()
    return jsonify({
        "rows": [
            {
                "resource": row.resource,
                "inbound_id": row.inbound_id,
                "source_system": row.source_system,
                "external_id": row.external_id,
                "external_version": row.external_version,
                "canonical_id": str(row.canonical_id) if row.canonical_id else None,
                "received_at": row.received_at.isoformat() if row.received_at else None,
                "status": row.status,
                "superseded_at": row.superseded_at.isoformat() if row.superseded_at else None,
                "ingested_via_token_id": row.ingested_via_token_id,
            }
            for row in rows
        ],
        "page": page,
        "per_page": per_page,
        "limit": per_page,
        "total": total,
        "has_next": page * per_page < total,
    })


@admin_bp.route("/inbound/activity/<resource>/<int:inbound_id>", methods=["GET"])
@require_auth
@require_admin_or_page_permission("inbound")
@with_db
def get_inbound_row(resource, inbound_id):
    """Return row metadata with payload fields redacted before serialization."""
    if resource not in _INBOUND_TABLES:
        return jsonify({"error": "unknown_resource", "valid": sorted(_INBOUND_TABLES)}), 400
    table = _INBOUND_TABLES[resource]
    row = g.db.execute(
        text(
            "SELECT inbound_id, source_system, external_id, external_version, canonical_id, "
            "source_payload, canonical_payload, received_at, status, superseded_at, "
            f"ingested_via_token_id FROM {table} WHERE inbound_id = :inbound_id"
        ),
        {"inbound_id": inbound_id},
    ).fetchone()
    if row is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify({
        "resource": resource,
        "inbound_id": row.inbound_id,
        "source_system": row.source_system,
        "external_id": row.external_id,
        "external_version": row.external_version,
        "canonical_id": str(row.canonical_id) if row.canonical_id else None,
        "source_payload": _safe_payload(row.source_payload),
        "canonical_payload": _safe_payload(row.canonical_payload),
        "received_at": row.received_at.isoformat() if row.received_at else None,
        "status": row.status,
        "superseded_at": row.superseded_at.isoformat() if row.superseded_at else None,
        "ingested_via_token_id": row.ingested_via_token_id,
        "source_payload_retained": row.source_payload is not None,
    })
