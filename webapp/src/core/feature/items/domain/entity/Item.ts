/**
 * Item master data (Flask /admin/items).
 * List rows are a projection; detail includes inventory + preferred bins.
 */

export type Item = {
	id: number;
	sku: string;
	name: string;
	description: string | null;
	upc: string | null;
	mpn: string | null;
	barcodeAliases: string[];
	category: string | null;
	weightLbs: number | null;
	lengthIn: number | null;
	widthIn: number | null;
	heightIn: number | null;
	defaultBinId: number | null;
	defaultBinCode: string | null;
	reorderPoint: number | null;
	reorderQty: number | null;
	isLotTracked: boolean;
	isSerialTracked: boolean;
	active: boolean;
	createdAt: string | null;
	updatedAt: string | null;
};

export type ItemInventoryLine = {
	inventoryId: number;
	binId: number;
	binCode: string | null;
	zoneName: string | null;
	quantityOnHand: number;
	quantityAllocated: number;
};

export type ItemPreferredBin = {
	preferredBinId: number;
	binId: number;
	binCode: string | null;
	zoneName: string | null;
	priority: number;
};

export type ItemDetail = {
	item: Item;
	inventory: ItemInventoryLine[];
	preferredBins: ItemPreferredBin[];
};

export type ItemListPage = {
	items: Item[];
	total: number;
	page: number;
	perPage: number;
	pages: number;
};

/** Payload aligned with CreateItemRequest / UpdateItemRequest. */
export type ItemWriteInput = {
	sku: string;
	itemName: string;
	description?: string | null;
	upc?: string | null;
	mpn?: string | null;
	category?: string | null;
	weightLbs?: number | null;
	defaultBinId?: number | null;
	reorderPoint?: number | null;
	reorderQty?: number | null;
	isActive?: boolean;
};

export type ItemListFilter = 'active' | 'archived' | 'all';

export type ItemListQuery = {
	q?: string;
	filter?: ItemListFilter;
	category?: string;
	page?: number;
	perPage?: number;
};
