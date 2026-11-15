/** Put-away domain: staging inventory moved into active Pickable bins. */
export type PendingPutawayItem = {
	inventoryId: number;
	itemId: number;
	sku: string;
	itemName: string;
	quantity: number;
	binId: number;
	binCode: string;
	binBarcode: string | null;
	lotNumber: string | null;
	suggestedBin: SuggestedBin | null;
};

export type SuggestedBin = {
	binId: number;
	binCode: string;
	binBarcode: string | null;
	zoneName: string | null;
	priority: number | null;
};

export type PutawaySuggestion = {
	itemId: number;
	sku: string;
	itemName: string;
	preferredBin: SuggestedBin | null;
	suggestedBin: SuggestedBin | null;
};

export type StagingBinSummary = {
	binId: number;
	binCode: string;
	skuCount: number;
	totalQuantity: number;
	items: StagingInventoryItem[];
};

export type StagingInventoryItem = {
	inventoryId: number;
	itemId: number;
	sku: string;
	itemName: string;
	quantity: number;
	lotNumber: string | null;
};

export type ConfirmPutawayInput = {
	itemId: number;
	fromBinId?: number;
	fromBinBarcode?: string;
	toBinId?: number;
	toBinBarcode?: string;
	quantity: number;
	lotNumber?: string | null;
};

export type ConfirmPutawayResult = {
	message: string;
	transferId: number;
	item: string;
	fromBin: string;
	toBin: string;
	quantity: number;
};

export type UpdatePreferredBinResult = {
	message: string;
	itemId: number;
	binId: number;
	binCode: string;
};
