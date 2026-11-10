/**
 * Warehouse master data.
 * Mobile list: GET /api/warehouses/list → { id, name, code }
 * Admin may expose richer fields (warehouse_id, warehouse_code, warehouse_name, active).
 */

export type Warehouse = {
	id: number;
	code: string;
	name: string;
	active: boolean;
};

export type ZoneType =
	| 'STORAGE'
	| 'RECEIVING'
	| 'STAGING'
	| 'SHIPPING'
	| 'QUALITY'
	| 'DAMAGE'
	| string;

export type Zone = {
	id: number;
	warehouseId: number;
	code: string;
	name: string;
	zoneType: ZoneType;
};

export type BinType = 'Pickable' | 'PickableStaging' | 'Staging' | string;

export type Bin = {
	id: number;
	warehouseId: number;
	zoneId: number | null;
	code: string;
	barcode: string | null;
	binType: BinType;
};
