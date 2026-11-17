"""Warehouse, Zone, and Bin endpoints."""

import json
import math
import uuid

from flask import g, jsonify, request
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from constants import ACTION_TRANSFER
from middleware.auth_middleware import check_warehouse_access, require_admin_or_page_permission, require_auth, warehouse_scope_clause
from middleware.db import with_db
from routes.admin import VALID_BIN_TYPES, VALID_ZONE_TYPES, admin_bp
from schemas.bins import CreateBinRequest, UpdateBinRequest
from schemas.warehouses import CreateWarehouseRequest, InterWarehouseTransferRequest, UpdateWarehouseRequest
from schemas.zones import CreateZoneRequest, UpdateZoneRequest
from services.audit_service import write_audit_log
from services.inventory_service import (
    add_inventory,
    set_inventory_quantity,
    release_satisfiable_backorders,
    RELEASE_SOURCE_TRANSFER,
)
from services.webhook_dispatcher.backorder_notifier import (
    dispatch_backorder_notification,
)
from utils.validation import validate_body


# ── Warehouses ────────────────────────────────────────────────────────────────

@admin_bp.route("/warehouses", methods=["GET"])
@require_auth
@require_admin_or_page_permission("warehouses")
@with_db
def list_warehouses():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 1000)

    total = g.db.execute(text("SELECT COUNT(*) FROM warehouses")).scalar()
    pages = max(1, math.ceil(total / per_page))

    rows = g.db.execute(
        text("SELECT warehouse_id, warehouse_code, warehouse_name, address, is_active, created_at FROM warehouses ORDER BY warehouse_id LIMIT :limit OFFSET :offset"),
        {"limit": per_page, "offset": (page - 1) * per_page},
    ).fetchall()
    return jsonify({
        "warehouses": [
            {"warehouse_id": r.warehouse_id, "warehouse_code": r.warehouse_code, "warehouse_name": r.warehouse_name,
             "address": r.address, "is_active": r.is_active, "created_at": r.created_at.isoformat() if r.created_at else None}
            for r in rows
        ],
        "total": total, "page": page, "per_page": per_page, "pages": pages,
    })


@admin_bp.route("/warehouses/<int:warehouse_id>", methods=["GET"])
@require_auth
@require_admin_or_page_permission("warehouses")
@with_db
def get_warehouse(warehouse_id):
    wh = g.db.execute(
        text("SELECT warehouse_id, warehouse_code, warehouse_name, address, is_active, created_at FROM warehouses WHERE warehouse_id = :wid"),
        {"wid": warehouse_id},
    ).fetchone()
    if not wh:
        return jsonify({"error": "Warehouse not found"}), 404

    zones = g.db.execute(
        text("SELECT zone_id, warehouse_id, zone_code, zone_name, zone_type, is_active FROM zones WHERE warehouse_id = :wid ORDER BY zone_id"),
        {"wid": warehouse_id},
    ).fetchall()

    return jsonify({
        "warehouse": {"warehouse_id": wh.warehouse_id, "warehouse_code": wh.warehouse_code, "warehouse_name": wh.warehouse_name,
                      "address": wh.address, "is_active": wh.is_active, "created_at": wh.created_at.isoformat() if wh.created_at else None},
        "zones": [{"zone_id": z.zone_id, "warehouse_id": z.warehouse_id, "zone_code": z.zone_code,
                    "zone_name": z.zone_name, "zone_type": z.zone_type, "is_active": z.is_active} for z in zones],
    })


@admin_bp.route("/warehouses", methods=["POST"])
@require_auth
@require_admin_or_page_permission("warehouses")
@validate_body(CreateWarehouseRequest)
@with_db
def create_warehouse(validated):
    data = validated.model_dump()

    dup = g.db.execute(text("SELECT 1 FROM warehouses WHERE warehouse_code = :c"), {"c": data["warehouse_code"]}).fetchone()
    if dup:
        return jsonify({"error": f"Duplicate warehouse_code: {data['warehouse_code']}"}), 400

    result = g.db.execute(
        text("INSERT INTO warehouses (warehouse_code, warehouse_name, address) VALUES (:code, :name, :addr) RETURNING warehouse_id, warehouse_code, warehouse_name, address, is_active, created_at"),
        {"code": data["warehouse_code"], "name": data["warehouse_name"], "addr": data.get("address")},
    )
    row = result.fetchone()
    g.db.commit()
    return jsonify({
        "warehouse_id": row.warehouse_id, "warehouse_code": row.warehouse_code, "warehouse_name": row.warehouse_name,
        "address": row.address, "is_active": row.is_active, "created_at": row.created_at.isoformat() if row.created_at else None,
    }), 201


@admin_bp.route("/warehouses/<int:warehouse_id>", methods=["PUT"])
@require_auth
@require_admin_or_page_permission("warehouses")
@validate_body(UpdateWarehouseRequest)
@with_db
def update_warehouse(warehouse_id, validated):
    data = validated.model_dump(exclude_unset=True)

    wh = g.db.execute(text("SELECT warehouse_id FROM warehouses WHERE warehouse_id = :wid"), {"wid": warehouse_id}).fetchone()
    if not wh:
        return jsonify({"error": "Warehouse not found"}), 404

    ALLOWED_FIELDS = {"warehouse_code", "warehouse_name", "address", "is_active"}
    fields, params = [], {"wid": warehouse_id}
    for col in ALLOWED_FIELDS:
        if col in data:
            fields.append(f"{col} = :{col}")
            params[col] = data[col]

    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    g.db.execute(text(f"UPDATE warehouses SET {', '.join(fields)} WHERE warehouse_id = :wid"), params)
    g.db.commit()

    row = g.db.execute(
        text("SELECT warehouse_id, warehouse_code, warehouse_name, address, is_active, created_at FROM warehouses WHERE warehouse_id = :wid"),
        {"wid": warehouse_id},
    ).fetchone()
    return jsonify({
        "warehouse_id": row.warehouse_id, "warehouse_code": row.warehouse_code, "warehouse_name": row.warehouse_name,
        "address": row.address, "is_active": row.is_active, "created_at": row.created_at.isoformat() if row.created_at else None,
    })


@admin_bp.route("/warehouses/<int:warehouse_id>", methods=["DELETE"])
@require_auth
@require_admin_or_page_permission("warehouses")
@with_db
def delete_warehouse(warehouse_id):
    wh = g.db.execute(text("SELECT warehouse_id FROM warehouses WHERE warehouse_id = :wid"), {"wid": warehouse_id}).fetchone()
    if not wh:
        return jsonify({"error": "Warehouse not found"}), 404

    # Check for existing inventory
    has_inv = g.db.execute(
        text("SELECT 1 FROM inventory WHERE warehouse_id = :wid AND quantity_on_hand > 0 LIMIT 1"),
        {"wid": warehouse_id},
    ).fetchone()
    if has_inv:
        return jsonify({"error": "Cannot delete warehouse with existing inventory"}), 400

    # Check for bins
    has_bins = g.db.execute(
        text("SELECT 1 FROM bins WHERE warehouse_id = :wid LIMIT 1"),
        {"wid": warehouse_id},
    ).fetchone()
    if has_bins:
        return jsonify({"error": "Cannot delete warehouse with existing bins. Remove all bins first."}), 400

    # Check for zones
    has_zones = g.db.execute(
        text("SELECT 1 FROM zones WHERE warehouse_id = :wid LIMIT 1"),
        {"wid": warehouse_id},
    ).fetchone()
    if has_zones:
        return jsonify({"error": "Cannot delete warehouse with existing zones. Remove all zones first."}), 400

    # Hard delete
    g.db.execute(text("DELETE FROM warehouses WHERE warehouse_id = :wid"), {"wid": warehouse_id})
    g.db.commit()
    return jsonify({"message": "Warehouse deleted"})


# ── Zones ─────────────────────────────────────────────────────────────────────

@admin_bp.route("/zones", methods=["GET"])
@require_auth
@require_admin_or_page_permission("zones")
@with_db
def list_zones():
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "50"))
        warehouse_arg = request.args.get("warehouse_id")
        warehouse_id = int(warehouse_arg) if warehouse_arg is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "page, per_page and warehouse_id must be integers"}), 400
    if page < 1:
        return jsonify({"error": "page must be a positive integer"}), 400
    if per_page < 1 or per_page > 1000:
        return jsonify({"error": "per_page must be between 1 and 1000"}), 400
    if warehouse_id is not None and warehouse_id <= 0:
        return jsonify({"error": "warehouse_id must be a positive integer"}), 400
    if warehouse_id is not None:
        allowed, denial = check_warehouse_access(warehouse_id)
        if not allowed:
            return denial

    scope_sql, params = warehouse_scope_clause("z.warehouse_id")
    where_sql = "WHERE 1 = 1 " + scope_sql
    if warehouse_id is not None:
        where_sql += " AND z.warehouse_id = :wid"
        params["wid"] = warehouse_id

    total = g.db.execute(
        text(f"SELECT COUNT(*) FROM zones z {where_sql}"),
        params,
    ).scalar()
    pages = max(1, math.ceil(total / per_page))

    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page
    rows = g.db.execute(
        text(f"""SELECT z.zone_id, z.warehouse_id, z.zone_code, z.zone_name, z.zone_type, z.is_active,
                        COUNT(b.bin_id) AS bins_count
                 FROM zones z LEFT JOIN bins b ON b.zone_id = z.zone_id
                 {where_sql}
                 GROUP BY z.zone_id, z.warehouse_id, z.zone_code, z.zone_name, z.zone_type, z.is_active
                 ORDER BY z.zone_id LIMIT :limit OFFSET :offset"""),
        params,
    ).fetchall()

    return jsonify({
        "zones": [{"zone_id": z.zone_id, "warehouse_id": z.warehouse_id, "zone_code": z.zone_code,
                    "zone_name": z.zone_name, "zone_type": z.zone_type, "is_active": z.is_active,
                    "bins_count": z.bins_count} for z in rows],
        "total": total, "page": page, "per_page": per_page, "pages": pages,
    })


@admin_bp.route("/zones", methods=["POST"])
@require_auth
@require_admin_or_page_permission("zones")
@validate_body(CreateZoneRequest)
@with_db
def create_zone(validated):
    data = validated.model_dump()

    warehouse = g.db.execute(
        text("SELECT warehouse_id FROM warehouses WHERE warehouse_id = :wid"),
        {"wid": data["warehouse_id"]},
    ).fetchone()
    if not warehouse:
        return jsonify({"error": "Warehouse not found"}), 404
    allowed, denial = check_warehouse_access(data["warehouse_id"])
    if not allowed:
        return denial

    dup = g.db.execute(
        text("SELECT 1 FROM zones WHERE warehouse_id = :wid AND zone_code = :code"),
        {"wid": data["warehouse_id"], "code": data["zone_code"]},
    ).fetchone()
    if dup:
        return jsonify({"error": f"Duplicate zone_code '{data['zone_code']}' in warehouse {data['warehouse_id']}"}), 400

    result = g.db.execute(
        text("INSERT INTO zones (warehouse_id, zone_code, zone_name, zone_type) VALUES (:wid, :code, :name, :type) RETURNING zone_id, warehouse_id, zone_code, zone_name, zone_type, is_active"),
        {"wid": data["warehouse_id"], "code": data["zone_code"], "name": data["zone_name"], "type": data["zone_type"]},
    )
    row = result.fetchone()
    g.db.commit()
    return jsonify({"zone_id": row.zone_id, "warehouse_id": row.warehouse_id, "zone_code": row.zone_code,
                    "zone_name": row.zone_name, "zone_type": row.zone_type, "is_active": row.is_active}), 201


@admin_bp.route("/zones/<int:zone_id>", methods=["PUT"])
@require_auth
@require_admin_or_page_permission("zones")
@validate_body(UpdateZoneRequest)
@with_db
def update_zone(zone_id, validated):
    data = validated.model_dump(exclude_unset=True)

    existing = g.db.execute(text("SELECT zone_id, warehouse_id FROM zones WHERE zone_id = :zid"), {"zid": zone_id}).fetchone()
    if not existing:
        return jsonify({"error": "Zone not found"}), 404
    allowed, denial = check_warehouse_access(existing.warehouse_id)
    if not allowed:
        return denial

    if "zone_code" in data:
        duplicate = g.db.execute(
            text("SELECT 1 FROM zones WHERE warehouse_id = :wid AND zone_code = :code AND zone_id <> :zid"),
            {"wid": existing.warehouse_id, "code": data["zone_code"], "zid": zone_id},
        ).fetchone()
        if duplicate:
            return jsonify({
                "error": f"Duplicate zone_code '{data['zone_code']}' in warehouse {existing.warehouse_id}"
            }), 400

    ALLOWED_FIELDS = {"zone_code", "zone_name", "zone_type", "is_active"}
    fields, params = [], {"zid": zone_id}
    for col in ALLOWED_FIELDS:
        if col in data:
            fields.append(f"{col} = :{col}")
            params[col] = data[col]

    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    try:
        g.db.execute(text(f"UPDATE zones SET {', '.join(fields)} WHERE zone_id = :zid"), params)
        g.db.commit()
    except IntegrityError:
        g.db.rollback()
        if "zone_code" in data:
            return jsonify({
                "error": f"Duplicate zone_code '{data['zone_code']}' in warehouse {existing.warehouse_id}"
            }), 400
        raise

    row = g.db.execute(
        text("SELECT zone_id, warehouse_id, zone_code, zone_name, zone_type, is_active FROM zones WHERE zone_id = :zid"),
        {"zid": zone_id},
    ).fetchone()
    return jsonify({"zone_id": row.zone_id, "warehouse_id": row.warehouse_id, "zone_code": row.zone_code,
                    "zone_name": row.zone_name, "zone_type": row.zone_type, "is_active": row.is_active})


@admin_bp.route("/zones/<int:zone_id>", methods=["DELETE"])
@require_auth
@require_admin_or_page_permission("zones")
@with_db
def delete_zone(zone_id):
    existing = g.db.execute(
        text("SELECT zone_id, zone_code, warehouse_id FROM zones WHERE zone_id = :zid"),
        {"zid": zone_id},
    ).fetchone()
    if not existing:
        return jsonify({"error": "Zone not found"}), 404
    allowed, denial = check_warehouse_access(existing.warehouse_id)
    if not allowed:
        return denial

    bin_count = g.db.execute(
        text("SELECT COUNT(*) FROM bins WHERE zone_id = :zid"),
        {"zid": zone_id},
    ).scalar()
    if bin_count:
        return jsonify({
            "error": f"Zone cannot be deleted because {bin_count} bin(s) are assigned to it. "
                     "Reassign or delete the bins first."
        }), 409

    g.db.execute(text("DELETE FROM zones WHERE zone_id = :zid"), {"zid": zone_id})
    g.db.commit()
    return jsonify({"message": "Zone deleted"})


# ── Bins ──────────────────────────────────────────────────────────────────────

@admin_bp.route("/bins", methods=["GET"])
@require_auth
@require_admin_or_page_permission("bins")
@with_db
def list_bins():
    try:
        page = int(request.args.get("page", "1"))
        per_page = int(request.args.get("per_page", "50"))
        warehouse_arg = request.args.get("warehouse_id")
        zone_arg = request.args.get("zone_id")
        warehouse_id = int(warehouse_arg) if warehouse_arg is not None else None
        zone_id = int(zone_arg) if zone_arg is not None else None
    except (TypeError, ValueError):
        return jsonify({"error": "page, per_page, warehouse_id and zone_id must be integers"}), 400

    if page < 1:
        return jsonify({"error": "page must be a positive integer"}), 400
    if not 1 <= per_page <= 1000:
        return jsonify({"error": "per_page must be between 1 and 1000"}), 400
    if warehouse_id is not None and warehouse_id <= 0:
        return jsonify({"error": "warehouse_id must be a positive integer"}), 400
    if zone_id is not None and zone_id <= 0:
        return jsonify({"error": "zone_id must be a positive integer"}), 400

    where_clauses = []
    params = {}
    bin_type = request.args.get("bin_type")
    if bin_type and bin_type not in VALID_BIN_TYPES:
        return jsonify({"error": f"bin_type must be one of: {', '.join(VALID_BIN_TYPES)}"}), 400
    search = (request.args.get("q") or "").strip()
    if warehouse_id is not None:
        where_clauses.append("b.warehouse_id = :wid")
        params["wid"] = warehouse_id
    scope_clause, scope_params = warehouse_scope_clause("b.warehouse_id")
    if scope_clause:
        where_clauses.append(scope_clause.removeprefix("AND ").strip())
        params.update(scope_params)
    if zone_id is not None:
        where_clauses.append("b.zone_id = :zid")
        params["zid"] = zone_id
    if bin_type:
        where_clauses.append("b.bin_type = :bin_type")
        params["bin_type"] = bin_type
    if search:
        where_clauses.append("(b.bin_code ILIKE :q OR b.bin_barcode ILIKE :q)")
        params["q"] = f"%{search}%"

    where_sql = ("WHERE " + " AND ".join(where_clauses)) if where_clauses else ""

    total = g.db.execute(
        text(f"SELECT COUNT(*) FROM bins b {where_sql}"), params
    ).scalar()
    pages = max(1, math.ceil(total / per_page))

    params["limit"] = per_page
    params["offset"] = (page - 1) * per_page
    rows = g.db.execute(
        text(f"""
            SELECT b.bin_id, b.zone_id, COALESCE(z.zone_name, '') AS zone_name, b.warehouse_id, b.bin_code, b.bin_barcode, b.bin_type,
                   b.aisle, b.row_num, b.level_num, b.position_num, b.pick_sequence, b.putaway_sequence,
                   b.max_weight_lbs, b.max_volume_cuft, b.is_active,
                   COALESCE(inv.quantity_on_hand, 0) AS quantity_on_hand,
                   COALESCE(inv.quantity_allocated, 0) AS quantity_allocated,
                   COALESCE(inv.inventory_lines, 0) AS inventory_lines
            FROM bins b
            LEFT JOIN zones z ON z.zone_id = b.zone_id
            LEFT JOIN (
                SELECT bin_id, SUM(quantity_on_hand) AS quantity_on_hand,
                       SUM(quantity_allocated) AS quantity_allocated, COUNT(*) AS inventory_lines
                FROM inventory GROUP BY bin_id
            ) inv ON inv.bin_id = b.bin_id
            {where_sql}
            ORDER BY b.bin_id LIMIT :limit OFFSET :offset
        """),
        params,
    ).fetchall()

    return jsonify({
        "bins": [
            {"bin_id": r.bin_id, "zone_id": r.zone_id, "zone_name": r.zone_name, "warehouse_id": r.warehouse_id,
             "bin_code": r.bin_code, "bin_barcode": r.bin_barcode, "bin_type": r.bin_type,
             "aisle": r.aisle, "row_num": r.row_num, "level_num": r.level_num, "position_num": r.position_num,
             "pick_sequence": r.pick_sequence, "putaway_sequence": r.putaway_sequence,
             "max_weight_lbs": float(r.max_weight_lbs) if r.max_weight_lbs is not None else None,
             "max_volume_cuft": float(r.max_volume_cuft) if r.max_volume_cuft is not None else None,
             "quantity_on_hand": r.quantity_on_hand, "quantity_allocated": r.quantity_allocated,
             "inventory_lines": r.inventory_lines, "is_active": r.is_active}
            for r in rows
        ],
        "total": total, "page": page, "per_page": per_page, "pages": pages,
    })


@admin_bp.route("/bins/<int:bin_id>", methods=["GET"])
@require_auth
@require_admin_or_page_permission("bins")
@with_db
def get_bin(bin_id):
    scope_clause, scope_params = warehouse_scope_clause("b.warehouse_id")
    b = g.db.execute(
        text(f"""
            SELECT b.bin_id, b.zone_id, z.zone_name, b.warehouse_id, b.bin_code, b.bin_barcode, b.bin_type,
                   b.aisle, b.row_num, b.level_num, b.position_num, b.pick_sequence, b.putaway_sequence,
                   b.max_weight_lbs, b.max_volume_cuft, b.is_active
            FROM bins b JOIN zones z ON z.zone_id = b.zone_id
            WHERE b.bin_id = :bid
              {scope_clause}
        """),
        {"bid": bin_id, **scope_params},
    ).fetchone()
    if not b:
        return jsonify({"error": "Bin not found"}), 404

    inv_rows = g.db.execute(
        text("""
            SELECT inv.inventory_id, inv.item_id, i.sku, i.item_name,
                   inv.quantity_on_hand, inv.quantity_allocated
            FROM inventory inv JOIN items i ON i.item_id = inv.item_id
            WHERE inv.bin_id = :bid
        """),
        {"bid": bin_id},
    ).fetchall()

    return jsonify({
        "bin": {"bin_id": b.bin_id, "zone_id": b.zone_id, "zone_name": b.zone_name, "warehouse_id": b.warehouse_id,
                "bin_code": b.bin_code, "bin_barcode": b.bin_barcode, "bin_type": b.bin_type,
                "aisle": b.aisle, "row_num": b.row_num, "level_num": b.level_num, "position_num": b.position_num,
                "pick_sequence": b.pick_sequence, "putaway_sequence": b.putaway_sequence,
                "max_weight_lbs": float(b.max_weight_lbs) if b.max_weight_lbs is not None else None,
                "max_volume_cuft": float(b.max_volume_cuft) if b.max_volume_cuft is not None else None,
                "is_active": b.is_active},
        # inventory_id is the row identity the admin grid keys on.
        # item_id alone is not unique here: inventory is UNIQUE(item_id,
        # bin_id, lot_number), so one item in this bin across two lots is
        # two rows.
        "inventory": [{"inventory_id": r.inventory_id, "item_id": r.item_id,
                       "sku": r.sku, "item_name": r.item_name,
                       "quantity_on_hand": r.quantity_on_hand, "quantity_allocated": r.quantity_allocated} for r in inv_rows],
    })


@admin_bp.route("/bins", methods=["POST"])
@require_auth
@require_admin_or_page_permission("bins")
@validate_body(CreateBinRequest)
@with_db
def create_bin(validated):
    data = validated.model_dump()

    allowed, response = check_warehouse_access(data["warehouse_id"])
    if not allowed:
        return response

    zone = g.db.execute(
        text("SELECT zone_id FROM zones WHERE zone_id = :zid AND warehouse_id = :wid"),
        {"zid": data["zone_id"], "wid": data["warehouse_id"]},
    ).fetchone()
    if not zone:
        return jsonify({"error": "Zone not found in the specified warehouse"}), 400

    dup = g.db.execute(
        text("SELECT 1 FROM bins WHERE warehouse_id = :wid AND bin_code = :code"),
        {"wid": data["warehouse_id"], "code": data["bin_code"]},
    ).fetchone()
    if dup:
        return jsonify({"error": f"Duplicate bin_code '{data['bin_code']}' in warehouse {data['warehouse_id']}"}), 400

    try:
        result = g.db.execute(
            text("""
            INSERT INTO bins (zone_id, warehouse_id, bin_code, bin_barcode, bin_type, aisle, row_num, level_num, position_num, pick_sequence, putaway_sequence, max_weight_lbs, max_volume_cuft, external_id)
            VALUES (:zone_id, :wid, :code, :barcode, :type, :aisle, :row, :level, :pos, :pick_seq, :put_seq, :max_weight, :max_volume, :ext_id)
            RETURNING bin_id, zone_id, warehouse_id, bin_code, bin_barcode, bin_type, aisle, row_num, level_num, position_num, pick_sequence, putaway_sequence, max_weight_lbs, max_volume_cuft, is_active
        """),
        {
            "zone_id": data["zone_id"], "wid": data["warehouse_id"], "code": data["bin_code"],
            "barcode": data["bin_barcode"], "type": data["bin_type"],
            "aisle": data.get("aisle"), "row": data.get("row_num"), "level": data.get("level_num"),
            "pos": data.get("position_num"), "pick_seq": data.get("pick_sequence", 0), "put_seq": data.get("putaway_sequence", 0),
            "max_weight": data.get("max_weight_lbs"), "max_volume": data.get("max_volume_cuft"),
            "ext_id": str(uuid.uuid4()),
        },
    )
        row = result.fetchone()
        g.db.commit()
    except IntegrityError:
        g.db.rollback()
        return jsonify({"error": f"Duplicate bin_code '{data['bin_code']}' in warehouse {data['warehouse_id']}"}), 400
    return jsonify({
        "bin_id": row.bin_id, "zone_id": row.zone_id, "warehouse_id": row.warehouse_id,
        "bin_code": row.bin_code, "bin_barcode": row.bin_barcode, "bin_type": row.bin_type,
        "aisle": row.aisle, "row_num": row.row_num, "level_num": row.level_num,
        "position_num": row.position_num, "pick_sequence": row.pick_sequence,
        "putaway_sequence": row.putaway_sequence,
        "max_weight_lbs": float(row.max_weight_lbs) if row.max_weight_lbs is not None else None,
        "max_volume_cuft": float(row.max_volume_cuft) if row.max_volume_cuft is not None else None,
        "is_active": row.is_active,
    }), 201


@admin_bp.route("/bins/<int:bin_id>", methods=["PUT"])
@require_auth
@require_admin_or_page_permission("bins")
@validate_body(UpdateBinRequest)
@with_db
def update_bin(bin_id, validated):
    data = validated.model_dump(exclude_unset=True)

    scope_clause, scope_params = warehouse_scope_clause("warehouse_id")
    existing = g.db.execute(
        text(f"SELECT bin_id, warehouse_id FROM bins WHERE bin_id = :bid {scope_clause}"),
        {"bid": bin_id, **scope_params},
    ).fetchone()
    if not existing:
        return jsonify({"error": "Bin not found"}), 404

    if "zone_id" in data:
        zone = g.db.execute(
            text("SELECT zone_id FROM zones WHERE zone_id = :zid AND warehouse_id = :wid"),
            {"zid": data["zone_id"], "wid": existing.warehouse_id},
        ).fetchone()
        if not zone:
            return jsonify({"error": "Zone does not belong to the bin warehouse"}), 400

    if "bin_code" in data:
        duplicate = g.db.execute(
            text("SELECT 1 FROM bins WHERE warehouse_id = :wid AND bin_code = :code AND bin_id <> :bid"),
            {"wid": existing.warehouse_id, "code": data["bin_code"], "bid": bin_id},
        ).fetchone()
        if duplicate:
            return jsonify({"error": f"Duplicate bin_code '{data['bin_code']}' in warehouse {existing.warehouse_id}"}), 400

    ALLOWED_FIELDS = {"bin_code", "bin_barcode", "bin_type", "aisle", "row_num", "level_num", "position_num", "pick_sequence", "putaway_sequence", "max_weight_lbs", "max_volume_cuft", "is_active", "zone_id"}
    fields, params = [], {"bid": bin_id}
    for col in ALLOWED_FIELDS:
        if col in data:
            fields.append(f"{col} = :{col}")
            params[col] = data[col]

    if not fields:
        return jsonify({"error": "No valid fields provided"}), 400

    try:
        g.db.execute(text(f"UPDATE bins SET {', '.join(fields)} WHERE bin_id = :bid"), params)
        g.db.commit()
    except IntegrityError:
        g.db.rollback()
        return jsonify({"error": "Bin update conflicts with an existing bin code or invalid relationship"}), 400

    row = g.db.execute(
        text("""
            SELECT b.bin_id, b.zone_id, z.zone_name, b.warehouse_id, b.bin_code, b.bin_barcode, b.bin_type,
                   b.aisle, b.row_num, b.level_num, b.position_num, b.pick_sequence, b.putaway_sequence,
                   b.max_weight_lbs, b.max_volume_cuft, b.is_active
            FROM bins b JOIN zones z ON z.zone_id = b.zone_id WHERE b.bin_id = :bid
        """),
        {"bid": bin_id},
    ).fetchone()
    return jsonify({
        "bin_id": row.bin_id, "zone_id": row.zone_id, "zone_name": row.zone_name, "warehouse_id": row.warehouse_id,
        "bin_code": row.bin_code, "bin_barcode": row.bin_barcode, "bin_type": row.bin_type,
        "aisle": row.aisle, "row_num": row.row_num, "level_num": row.level_num,
        "position_num": row.position_num, "pick_sequence": row.pick_sequence,
        "putaway_sequence": row.putaway_sequence,
        "max_weight_lbs": float(row.max_weight_lbs) if row.max_weight_lbs is not None else None,
        "max_volume_cuft": float(row.max_volume_cuft) if row.max_volume_cuft is not None else None,
        "is_active": row.is_active,
    })


@admin_bp.route("/bins/<int:bin_id>", methods=["DELETE"])
@require_auth
@require_admin_or_page_permission("bins")
@with_db
def delete_bin(bin_id):
    scope_clause, scope_params = warehouse_scope_clause("warehouse_id")
    existing = g.db.execute(
        text(f"SELECT bin_id, bin_code FROM bins WHERE bin_id = :bid {scope_clause}"),
        {"bid": bin_id, **scope_params},
    ).fetchone()
    if not existing:
        return jsonify({"error": "Bin not found"}), 404

    inv = g.db.execute(
        text("SELECT COUNT(*) FROM inventory WHERE bin_id = :bid AND quantity_on_hand > 0"),
        {"bid": bin_id},
    ).scalar()
    if inv:
        return jsonify({
            "error": f"Bin cannot be deleted because {inv} inventory record(s) remain with quantity on hand. "
                     "Move or adjust the inventory to zero first."
        }), 409

    pref = g.db.execute(
        text("SELECT COUNT(*) FROM preferred_bins WHERE bin_id = :bid"),
        {"bid": bin_id},
    ).scalar()
    if pref:
        return jsonify({
            "error": f"Bin cannot be deleted because {pref} preferred-bin mapping(s) reference it. "
                     "Remove them from the Preferred Bins page first."
        }), 409

    g.db.execute(text("DELETE FROM inventory WHERE bin_id = :bid"), {"bid": bin_id})
    g.db.execute(text("DELETE FROM bins WHERE bin_id = :bid"), {"bid": bin_id})
    g.db.commit()
    return jsonify({"message": "Bin deleted"})


# ── Inter-Warehouse Transfers ────────────────────────────────────────────────

@admin_bp.route("/inter-warehouse-transfer", methods=["POST"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@validate_body(InterWarehouseTransferRequest)
@with_db
def create_inter_warehouse_transfer(validated):
    """Move available stock across warehouses exactly once per idempotency key."""
    item_id = validated.item_id
    from_bin_id = validated.from_bin_id
    from_warehouse_id = validated.from_warehouse_id
    to_bin_id = validated.to_bin_id
    to_warehouse_id = validated.to_warehouse_id
    quantity = validated.quantity
    reason = (validated.reason or "").strip()
    idempotency_key = str(validated.idempotency_key)
    username = g.current_user["username"]
    request_payload = {
        "item_id": item_id, "from_bin_id": from_bin_id,
        "from_warehouse_id": from_warehouse_id, "to_bin_id": to_bin_id,
        "to_warehouse_id": to_warehouse_id, "quantity": quantity, "reason": reason,
    }

    # Scope both warehouse IDs in SQL before exposing whether they exist.
    scope_sql, scope_params = warehouse_scope_clause("warehouse_id")
    warehouse_rows = g.db.execute(
        text(
            "SELECT warehouse_id FROM warehouses "
            "WHERE warehouse_id = ANY(:warehouse_ids) AND is_active = TRUE " + scope_sql
        ),
        {"warehouse_ids": [from_warehouse_id, to_warehouse_id], **scope_params},
    ).fetchall()
    if {row.warehouse_id for row in warehouse_rows} != {from_warehouse_id, to_warehouse_id}:
        return jsonify({"error": "One or both warehouses are unavailable"}), 404

    # Defence in depth: check both sides independently after the scoped lookup.
    for warehouse_id in (from_warehouse_id, to_warehouse_id):
        allowed, denial = check_warehouse_access(warehouse_id)
        if not allowed:
            return denial

    # Serialize requests sharing a key, including requests arriving while
    # the original transaction is still in flight.
    lock_key = username + ":" + idempotency_key
    g.db.execute(
        text("SELECT pg_advisory_xact_lock(hashtextextended(:lock_key, 0))"),
        {"lock_key": lock_key},
    )
    prior = g.db.execute(
        text(
            "SELECT request_payload, response_payload "
            "FROM inter_warehouse_transfer_requests "
            "WHERE username = :username AND idempotency_key = :key"
        ),
        {"username": username, "key": idempotency_key},
    ).fetchone()
    if prior:
        if prior.request_payload != request_payload:
            return jsonify({"error": "Idempotency key was already used for a different transfer"}), 409
        return jsonify(prior.response_payload), 201

    item = g.db.execute(
        text("SELECT item_id, sku FROM items WHERE item_id = :iid AND is_active = TRUE"),
        {"iid": item_id},
    ).fetchone()
    if not item:
        return jsonify({"error": "Item not found or inactive"}), 404

    source_scope, source_params = warehouse_scope_clause("b.warehouse_id")
    from_bin = g.db.execute(
        text(
            "SELECT b.bin_id, b.bin_code, b.warehouse_id FROM bins b "
            "WHERE b.bin_id = :bid AND b.warehouse_id = :wid AND b.is_active = TRUE "
            + source_scope
        ),
        {"bid": from_bin_id, "wid": from_warehouse_id, **source_params},
    ).fetchone()
    if not from_bin:
        return jsonify({"error": "Source bin not found"}), 404

    destination_scope, destination_params = warehouse_scope_clause("b.warehouse_id")
    to_bin = g.db.execute(
        text(
            "SELECT b.bin_id, b.bin_code, b.warehouse_id FROM bins b "
            "WHERE b.bin_id = :bid AND b.warehouse_id = :wid AND b.is_active = TRUE "
            + destination_scope
        ),
        {"bid": to_bin_id, "wid": to_warehouse_id, **destination_params},
    ).fetchone()
    if not to_bin:
        return jsonify({"error": "Destination bin not found"}), 404

    # Lock both item/bin identities in a stable order. add_inventory takes
    # these same transaction locks, preventing opposite-direction deadlocks.
    for bin_id in sorted((from_bin_id, to_bin_id)):
        g.db.execute(
            text("SELECT pg_advisory_xact_lock(:item_id, :bin_id)"),
            {"item_id": item_id, "bin_id": bin_id},
        )

    source_rows = g.db.execute(
        text(
            "SELECT inventory_id, quantity_on_hand, quantity_allocated, lot_number "
            "FROM inventory WHERE item_id = :iid AND bin_id = :bid AND warehouse_id = :wid "
            "ORDER BY lot_number NULLS FIRST, inventory_id FOR UPDATE"
        ),
        {"iid": item_id, "bid": from_bin_id, "wid": from_warehouse_id},
    ).fetchall()
    available = sum(max(row.quantity_on_hand - row.quantity_allocated, 0) for row in source_rows)
    if available < quantity:
        return jsonify({"error": f"Insufficient unallocated inventory in source bin. Available: {available}"}), 400

    remaining = quantity
    transfer_ids = []
    deferred_notifications = []
    transferred_at = None
    for source_row in source_rows:
        row_available = max(source_row.quantity_on_hand - source_row.quantity_allocated, 0)
        moved = min(row_available, remaining)
        if moved <= 0:
            continue

        set_inventory_quantity(g.db, source_row.inventory_id, source_row.quantity_on_hand - moved)
        add_inventory(g.db, item_id, to_bin_id, to_warehouse_id, moved, lot_number=source_row.lot_number)
        transfer = g.db.execute(
            text("""
                INSERT INTO bin_transfers
                    (item_id, from_bin_id, to_bin_id, warehouse_id, quantity,
                     lot_number, transferred_by, transfer_type, reason, external_id)
                VALUES
                    (:iid, :from_bid, :to_bid, :wid, :qty,
                     :lot, :username, 'INTER_WAREHOUSE', :reason, :ext_id)
                RETURNING transfer_id, transferred_at
            """),
            {
                "iid": item_id, "from_bid": from_bin_id, "to_bid": to_bin_id,
                "wid": from_warehouse_id, "qty": moved, "lot": source_row.lot_number,
                "username": username, "reason": reason, "ext_id": str(uuid.uuid4()),
            },
        ).fetchone()
        transfer_ids.append(transfer.transfer_id)
        transferred_at = transfer.transferred_at
        remaining -= moved
        if remaining == 0:
            break

    # Stock, transfer rows, backorder releases, audit rows and idempotency
    # receipt all share this one transaction.
    release_satisfiable_backorders(
        g.db, warehouse_id=to_warehouse_id, item_id=item_id,
        source_txn_id=g.source_txn_id, deferred_notifications=deferred_notifications,
        source=RELEASE_SOURCE_TRANSFER,
    )

    transfer_details = {
        "transfer_ids": transfer_ids, "item_id": item_id,
        "from_bin_id": from_bin_id, "to_bin_id": to_bin_id,
        "from_warehouse_id": from_warehouse_id, "to_warehouse_id": to_warehouse_id,
        "quantity": quantity, "reason": reason,
    }
    write_audit_log(
        g.db, ACTION_TRANSFER, "ITEM", item_id, user_id=g.current_user["user_id"],
        warehouse_id=from_warehouse_id, details={**transfer_details, "direction": "OUT"},
    )
    write_audit_log(
        g.db, ACTION_TRANSFER, "ITEM", item_id, user_id=g.current_user["user_id"],
        warehouse_id=to_warehouse_id, details={**transfer_details, "direction": "IN"},
    )

    response_payload = {
        "transfer_id": transfer_ids[0], "transfer_ids": transfer_ids,
        "item_id": item_id, "sku": item.sku,
        "from_bin_id": from_bin_id, "from_bin_code": from_bin.bin_code,
        "from_warehouse_id": from_warehouse_id,
        "to_bin_id": to_bin_id, "to_bin_code": to_bin.bin_code,
        "to_warehouse_id": to_warehouse_id, "quantity": quantity, "reason": reason,
        "transferred_at": transferred_at.isoformat() if transferred_at else None,
    }
    g.db.execute(
        text("""
            INSERT INTO inter_warehouse_transfer_requests
                (username, idempotency_key, request_payload, response_payload)
            VALUES (:username, :key, CAST(:request_payload AS jsonb),
                    CAST(:response_payload AS jsonb))
        """),
        {
            "username": username, "key": idempotency_key,
            "request_payload": json.dumps(request_payload, sort_keys=True),
            "response_payload": json.dumps(response_payload, sort_keys=True),
        },
    )
    g.db.commit()

    # External notifications run only after commit.
    for event_type, payload, wid in deferred_notifications:
        dispatch_backorder_notification(event_type=event_type, payload=payload, warehouse_id=wid)

    return jsonify(response_payload), 201


@admin_bp.route("/inter-warehouse-transfers", methods=["GET"])
@require_auth
@require_admin_or_page_permission("transfer-orders")
@with_db
def list_inter_warehouse_transfers():
    """Return only transfers whose source AND destination are in user scope."""
    try:
        limit = int(request.args.get("limit", "50"))
        from_warehouse_id = request.args.get("from_warehouse_id", type=int)
        to_warehouse_id = request.args.get("to_warehouse_id", type=int)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid transfer history filters"}), 400
    if limit < 1 or limit > 500:
        return jsonify({"error": "limit must be between 1 and 500"}), 400
    for warehouse_id in (from_warehouse_id, to_warehouse_id):
        if warehouse_id is not None and warehouse_id <= 0:
            return jsonify({"error": "warehouse filters must be positive"}), 400

    source_scope, source_params = warehouse_scope_clause("fb.warehouse_id")
    destination_scope, destination_params = warehouse_scope_clause("tb.warehouse_id")
    filters = []
    params = {"lim": limit, **source_params, **destination_params}
    if from_warehouse_id is not None:
        filters.append("AND fb.warehouse_id = :from_warehouse_id")
        params["from_warehouse_id"] = from_warehouse_id
    if to_warehouse_id is not None:
        filters.append("AND tb.warehouse_id = :to_warehouse_id")
        params["to_warehouse_id"] = to_warehouse_id

    rows = g.db.execute(
        text("""
            SELECT bt.transfer_id, bt.item_id, bt.from_bin_id, bt.to_bin_id,
                   bt.quantity, bt.transferred_by, bt.transferred_at,
                   i.sku, i.item_name,
                   fb.bin_code AS from_bin_code, fb.warehouse_id AS from_warehouse_id,
                   fw.warehouse_name AS from_warehouse_name, fw.warehouse_code AS from_warehouse_code,
                   tb.bin_code AS to_bin_code, tb.warehouse_id AS to_warehouse_id,
                   tw.warehouse_name AS to_warehouse_name, tw.warehouse_code AS to_warehouse_code
            FROM bin_transfers bt
            JOIN items i ON i.item_id = bt.item_id
            JOIN bins fb ON fb.bin_id = bt.from_bin_id
            JOIN warehouses fw ON fw.warehouse_id = fb.warehouse_id
            JOIN bins tb ON tb.bin_id = bt.to_bin_id
            JOIN warehouses tw ON tw.warehouse_id = tb.warehouse_id
            WHERE bt.transfer_type = 'INTER_WAREHOUSE'
            """ + source_scope + " " + destination_scope + " " + " ".join(filters) + """
            ORDER BY bt.transferred_at DESC, bt.transfer_id DESC
            LIMIT :lim
        """),
        params,
    ).fetchall()

    return jsonify({
        "transfers": [
            {
                "transfer_id": r.transfer_id, "item_id": r.item_id,
                "sku": r.sku, "item_name": r.item_name,
                "from_bin_id": r.from_bin_id, "from_bin_code": r.from_bin_code,
                "from_warehouse_id": r.from_warehouse_id,
                "from_warehouse_name": r.from_warehouse_name, "from_warehouse_code": r.from_warehouse_code,
                "to_bin_id": r.to_bin_id, "to_bin_code": r.to_bin_code,
                "to_warehouse_id": r.to_warehouse_id,
                "to_warehouse_name": r.to_warehouse_name, "to_warehouse_code": r.to_warehouse_code,
                "quantity": r.quantity, "transferred_by": r.transferred_by,
                "transferred_at": r.transferred_at.isoformat() if r.transferred_at else None,
                "status": "completed",
            }
            for r in rows
        ]
    })
