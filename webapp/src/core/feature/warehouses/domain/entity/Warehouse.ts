/**
 * Warehouse master data and physical storage hierarchy.
 * A warehouse owns zones; each bin belongs to one warehouse and may belong
 * to one zone. The shape follows the admin domain model and warehouse APIs.
 */

export type Warehouse = {
	id: number;
	code: string;
	name: string;
	address?: string | null;
	active: boolean;
	createdAt?: string | null;
};

export type ZoneType =
	| 'RECEIVING'
	| 'STORAGE'
	| 'PICKING'
	| 'STAGING'
	| 'SHIPPING'
	| (string & {});

export type Zone = {
	id: number;
	warehouseId: number;
	code: string;
	name: string;
	zoneType: ZoneType;
	active?: boolean;
};

export type BinType = 'Staging' | 'PickableStaging' | 'Pickable' | (string & {});

export type Bin = {
	id: number;
	warehouseId: number;
	zoneId: number | null;
	zoneName?: string | null;
	code: string;
	barcode: string | null;
	binType: BinType;
	aisle?: string | null;
	rowNumber?: number | null;
	levelNumber?: number | null;
	positionNumber?: number | null;
	pickSequence?: number;
	putawaySequence?: number;
	active?: boolean;
};
