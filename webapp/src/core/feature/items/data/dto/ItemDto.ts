export type ItemDto = {
	id?: number;
	item_id?: number;
	sku: string;
	item_name?: string;
	name?: string;
	upc?: string | null;
	mpn?: string | null;
	category?: string | null;
	active?: boolean;
	is_active?: boolean;
	archived?: boolean;
};

export type ItemListResponseDto = {
	items?: ItemDto[];
	data?: ItemDto[];
	results?: ItemDto[];
};
