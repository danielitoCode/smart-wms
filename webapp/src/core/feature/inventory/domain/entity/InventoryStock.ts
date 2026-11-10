/**
 * Domain entity: stock position of an item in a bin.
 * Derived from SentryWMS inventory rows (item_id, bin_id, warehouse_id, quantity_on_hand, lot_number).
 * Enriched fields (sku, itemName, binCode) come from joined admin/lookup responses when available.
 */
export type InventoryStock = {
	inventoryId: number;
	itemId: number;
	binId: number;
	warehouseId: number;
	quantityOnHand: number;
	lotNumber: string | null;
	sku: string | null;
	itemName: string | null;
	binCode: string | null;
};
