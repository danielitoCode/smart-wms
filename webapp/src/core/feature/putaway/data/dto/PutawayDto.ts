export type PendingPutawayItemDto = {
	inventory_id: number; item_id: number; sku: string; item_name: string; quantity: number;
	bin_id: number; bin_code: string; bin_barcode?: string | null; lot_number?: string | null; suggested_bin?: string | null;
	suggested_bin_id?: number | null; suggested_bin_priority?: number | null;
	suggested_bin_barcode?: string | null; suggested_bin_zone?: string | null;
};
export type PendingPutawayResponseDto = { pending_items?: PendingPutawayItemDto[]; items?: PendingPutawayItemDto[] };
export type SuggestedBinDto = { bin_id: number; bin_code: string; bin_barcode?: string | null; zone_name?: string | null; priority?: number | null };
export type SuggestResponseDto = { item_id: number; sku: string; item_name: string; preferred_bin?: SuggestedBinDto | null; suggested_bin?: SuggestedBinDto | null };
export type StagingInventoryItemDto = { inventory_id: number; item_id: number; sku: string; item_name: string; quantity_on_hand: number; lot_number?: string | null };
export type StagingBinDto = { bin_id: number; bin_code: string; sku_count: number; total_qty: number; items: StagingInventoryItemDto[] };
export type StagingSummaryResponseDto = { warehouse_id: number; bins: StagingBinDto[] };
export type ConfirmPutawayResponseDto = { message: string; transfer_id: number; item: string; from_bin: string; to_bin: string; quantity: number };
export type UpdatePreferredResponseDto = { message: string; item_id: number; bin_id: number; bin_code: string };
