/**
 * Put-away domain — staging → storage transfers.
 * Contracts: GET /api/putaway/pending/{warehouse_id},
 * GET /api/putaway/suggest/{item_id}, POST /api/putaway/confirm
 */

export type PendingPutawayItem = {
	inventoryId: number;
	itemId: number;
	sku: string;
	itemName: string;
	quantity: number;
	binId: number;
	binCode: string;
	lotNumber: string | null;
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

export type ConfirmPutawayInput = {
	itemId: number;
	fromBinId: number;
	toBinId: number;
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
