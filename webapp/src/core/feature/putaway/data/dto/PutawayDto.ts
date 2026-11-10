export type PendingPutawayItemDto = {
	inventory_id: number;
	item_id: number;
	sku: string;
	item_name: string;
	quantity: number;
	bin_id: number;
	bin_code: string;
	lot_number?: string | null;
};

export type PendingPutawayResponseDto = {
	pending_items?: PendingPutawayItemDto[];
	items?: PendingPutawayItemDto[];
};

export type SuggestedBinDto = {
	bin_id: number;
	bin_code: string;
	bin_barcode?: string | null;
	zone_name?: string | null;
	priority?: number | null;
};

export type SuggestResponseDto = {
	item_id: number;
	sku: string;
	item_name: string;
	preferred_bin?: SuggestedBinDto | null;
	suggested_bin?: SuggestedBinDto | null;
};

export type ConfirmPutawayResponseDto = {
	message: string;
	transfer_id: number;
	item: string;
	from_bin: string;
	to_bin: string;
	quantity: number;
};
