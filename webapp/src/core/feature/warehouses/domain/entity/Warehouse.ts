export type Warehouse = {
	id: number; code: string; name: string; address: string | null; active: boolean; createdAt: string | null;
};
export type CreateWarehouseInput = { code: string; name: string; address?: string | null };
export type UpdateWarehouseInput = { id: number; name?: string; address?: string | null; active?: boolean };

export type ZoneType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'STAGING' | 'SHIPPING';
export type Zone = { id: number; warehouseId: number; code: string; name: string; zoneType: ZoneType; active: boolean };
export type CreateZoneInput = { warehouseId: number; code: string; name: string; zoneType: ZoneType };
export type UpdateZoneInput = { id: number; code?: string; name?: string; zoneType?: ZoneType; active?: boolean };

export type BinType = 'Staging' | 'PickableStaging' | 'Pickable';
export type Bin = {
	id: number; warehouseId: number; zoneId: number | null; zoneName: string | null;
	code: string; barcode: string | null; binType: BinType; aisle: string | null;
	rowNumber: number | null; levelNumber: number | null; positionNumber: number | null;
	pickSequence: number; putawaySequence: number; active: boolean;
};
export type CreateBinInput = {
	warehouseId: number; zoneId: number; code: string; barcode: string;
	binType: BinType; aisle?: string | null; pickSequence?: number;
};
export type UpdateBinInput = {
	id: number; zoneId?: number; code?: string; barcode?: string | null;
	binType?: BinType; aisle?: string | null; pickSequence?: number; active?: boolean;
};
export type BinInventoryRow = {
	inventoryId: number; itemId: number; sku: string; itemName: string;
	quantityOnHand: number; quantityAllocated: number;
};
export type BinDetail = { bin: Bin; inventory: BinInventoryRow[] };
export type BinPage = { items: Bin[]; total: number; page: number; pages: number; perPage: number };
