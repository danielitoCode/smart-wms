export type ItemDto = {
	item_id?: number;
	id?: number;
	sku: string;
	item_name?: string;
	name?: string;
	description?: string | null;
	upc?: string | null;
	mpn?: string | null;
	barcode_aliases?: string[] | null;
	category?: string | null;
	weight_lbs?: number | null;
	length_in?: number | null;
	width_in?: number | null;
	height_in?: number | null;
	default_bin_id?: number | null;
	default_bin_code?: string | null;
	reorder_point?: number | null;
	reorder_qty?: number | null;
	is_lot_tracked?: boolean;
	is_serial_tracked?: boolean;
	is_active?: boolean;
	active?: boolean;
	created_at?: string | null;
	updated_at?: string | null;
};

export type ItemInventoryDto = {
	inventory_id: number;
	bin_id: number;
	bin_code?: string | null;
	zone_name?: string | null;
	quantity_on_hand: number;
	quantity_allocated: number;
};

export type ItemPreferredBinDto = {
	preferred_bin_id: number;
	bin_id: number;
	bin_code?: string | null;
	zone_name?: string | null;
	priority: number;
};

/** Flask get_item wrapper */
export type ItemDetailResponseDto = {
	item: ItemDto;
	inventory?: ItemInventoryDto[];
	preferred_bins?: ItemPreferredBinDto[];
};

export type ItemListResponseDto = {
	items: ItemDto[];
	total: number;
	page: number;
	per_page: number;
	pages: number;
};

export type ItemArchiveResponseDto = {
	message: string;
	is_active: boolean;
};

export type ItemWriteBodyDto = {
	sku?: string;
	item_name?: string;
	description?: string | null;
	upc?: string | null;
	mpn?: string | null;
	category?: string | null;
	weight_lbs?: number | null;
	default_bin_id?: number | null;
	reorder_point?: number | null;
	reorder_qty?: number | null;
	is_active?: boolean;
};
