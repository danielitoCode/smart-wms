export type Warehouse = { id: number; code: string; name: string; address: string | null; active: boolean; createdAt: string | null };
export type WarehousePage = { items: Warehouse[]; total: number; page: number; pages: number; perPage: number };
export type CreateWarehouseInput = { code: string; name: string; address?: string | null };
export type UpdateWarehouseInput = { id: number; code?: string; name?: string; address?: string | null; active?: boolean };

export type ZoneType = 'RECEIVING' | 'STORAGE' | 'PICKING' | 'STAGING' | 'SHIPPING';
export type Zone = { id: number; warehouseId: number; code: string; name: string; zoneType: ZoneType; active: boolean; binsCount?: number };
export type CreateZoneInput = { warehouseId: number; code: string; name: string; zoneType: ZoneType };
export type UpdateZoneInput = { id: number; code?: string; name?: string; zoneType?: ZoneType; active?: boolean };

export type BinType = 'Staging' | 'PickableStaging' | 'Pickable';
export type Bin = {
	id: number; warehouseId: number; zoneId: number | null; zoneName: string | null;
	code: string; barcode: string | null; binType: BinType; aisle: string | null;
	rowNumber: number | null; levelNumber: number | null; positionNumber: number | null;
	pickSequence: number; putawaySequence: number; active: boolean;
	maxWeightLbs: number | null; maxVolumeCuft: number | null;
	quantityOnHand: number; quantityAllocated: number; inventoryLines: number;
};
export type CreateBinInput = {
	warehouseId: number; zoneId: number; code: string; barcode: string; binType: BinType;
	aisle?: string | null; rowNumber?: number | null; levelNumber?: number | null;
	positionNumber?: number | null; pickSequence?: number; putawaySequence?: number;
	maxWeightLbs?: number | null; maxVolumeCuft?: number | null;
};
export type UpdateBinInput = {
	id: number; zoneId?: number; code?: string; barcode?: string | null; binType?: BinType;
	aisle?: string | null; rowNumber?: number | null; levelNumber?: number | null;
	positionNumber?: number | null; pickSequence?: number; putawaySequence?: number; active?: boolean;
	maxWeightLbs?: number | null; maxVolumeCuft?: number | null;
};
export type BinInventoryRow = { inventoryId: number; itemId: number; sku: string; itemName: string; quantityOnHand: number; quantityAllocated: number };
export type BinDetail = { bin: Bin; inventory: BinInventoryRow[]; occupancy: { quantityOnHand: number; quantityAllocated: number; quantityAvailable: number; inventoryLines: number } };
export type OperationalBinSearchResult = { id: number; code: string; barcode: string | null; binType: BinType; zoneName: string | null; aisle: string | null; rowNumber: number | null; levelNumber: number | null };
export type OperationalBinLookup = { bin: OperationalBinSearchResult; items: Array<{ itemId: number; sku: string; itemName: string; upc: string | null; quantityOnHand: number; quantityAllocated: number; quantityAvailable: number; lotNumber: string | null }> };
export type BinPage = { items: Bin[]; total: number; page: number; pages: number; perPage: number };
