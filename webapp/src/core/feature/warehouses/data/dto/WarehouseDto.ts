export type WarehouseListItemDto = {
	id?: number;
	warehouse_id?: number;
	name?: string;
	warehouse_name?: string;
	code?: string;
	warehouse_code?: string;
	address?: string | null;
	active?: boolean;
	is_active?: boolean;
	created_at?: string | null;
};

export type WarehouseListResponseDto = {
	warehouses?: WarehouseListItemDto[];
	items?: WarehouseListItemDto[];
	data?: WarehouseListItemDto[];
	total?: number;
	page?: number;
	per_page?: number;
	pages?: number;
};

export type WarehouseDetailResponseDto = {
	warehouse: WarehouseListItemDto;
	zones?: ZoneDto[];
};

export type ZoneDto = {
	id?: number;
	zone_id?: number;
	warehouse_id: number;
	zone_code?: string;
	code?: string;
	zone_name?: string;
	name?: string;
	zone_type: string;
	is_active?: boolean;
	active?: boolean;
};

export type ZoneListResponseDto = {
	zones?: ZoneDto[];
	items?: ZoneDto[];
	data?: ZoneDto[];
	total?: number;
	page?: number;
	per_page?: number;
	pages?: number;
};

export type BinDto = {
	id?: number;
	bin_id?: number;
	warehouse_id: number;
	zone_id?: number | null;
	zone_name?: string | null;
	bin_code?: string;
	code?: string;
	bin_barcode?: string | null;
	barcode?: string | null;
	bin_type: string;
	aisle?: string | null;
	row_num?: number | null;
	level_num?: number | null;
	position_num?: number | null;
	pick_sequence?: number;
	putaway_sequence?: number;
	is_active?: boolean;
	active?: boolean;
};

export type BinListResponseDto = {
	bins?: BinDto[];
	items?: BinDto[];
	data?: BinDto[];
	total?: number;
	page?: number;
	per_page?: number;
	pages?: number;
};

export type BinInventoryDto = {
	inventory_id: number;
	item_id: number;
	sku: string;
	item_name: string;
	quantity_on_hand: number;
	quantity_allocated: number;
};

export type BinDetailResponseDto = {
	bin: BinDto;
	inventory: BinInventoryDto[];
};
