/**
 * One persisted inventory row. A row is identified by inventoryId, not by
 * itemId/binId: the same item/bin pair may contain multiple lots.
 */
export type InventoryStock = {
	inventoryId: number;
	itemId: number;
	binId: number;
	/** The current inventory-list response omits warehouse_id; available on future enriched contracts. */
	warehouseId?: number;
	quantityOnHand: number;
	quantityAllocated: number;
	quantityAvailable: number;
	committedToOrders: number;
	lotNumber: string | null;
	sku: string;
	itemName: string;
	binCode: string;
	zoneName: string | null;
	lastCountedAt: string | null;
	/** Supplied only by API versions that expose the item's reorder point. */
	reorderPoint?: number | null;
};

export type InventoryQuery = {
	warehouseId?: number;
	itemId?: number;
	binId?: number;
	query?: string;
	page?: number;
	perPage?: number;
};

export type InventoryPage = {
	items: InventoryStock[];
	page: number;
	perPage: number;
	total: number;
	pages: number;
};
