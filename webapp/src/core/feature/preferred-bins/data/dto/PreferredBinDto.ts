export type PreferredBinDto = {
	preferred_bin_id: number;
	item_id: number;
	bin_id: number;
	warehouse_id: number;
	priority: number;
	updated_at: string | null;
	sku: string | null;
	item_name: string | null;
	bin_code: string | null;
	zone_name: string | null;
	notes?: string | null;
};

export type PreferredBinListResponseDto = { preferred_bins?: PreferredBinDto[] };
export type PreferredBinCreateDto = { item_id: number; bin_id: number; priority: number };
export type PreferredBinPriorityDto = { priority: number };
export type PreferredBinMessageDto = { message: string };
export type PreferredBinCatalogDto = {
	warehouses: Array<{ warehouse_id: number; warehouse_code: string; warehouse_name: string }>;
	bins: Array<{ bin_id: number; warehouse_id: number; zone_id: number | null; zone_name: string | null; bin_code: string; bin_barcode: string | null; bin_type: 'Pickable'; is_active: boolean }>;
	total: number;
	page: number;
	per_page: number;
	pages: number;
};
