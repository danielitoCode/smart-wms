export type WarehouseListItemDto = {
	id?: number;
	warehouse_id?: number;
	name?: string;
	warehouse_name?: string;
	code?: string;
	warehouse_code?: string;
	active?: boolean;
	is_active?: boolean;
};

export type WarehouseListResponseDto = {
	warehouses?: WarehouseListItemDto[];
	items?: WarehouseListItemDto[];
	data?: WarehouseListItemDto[];
};

export type ZoneDto = {
	id?: number;
	zone_id?: number;
	warehouse_id: number;
	zone_code?: string;
	code?: string;
	zone_name?: string;
	name?: string;
	zone_type?: string;
};

export type ZoneListResponseDto = {
	zones?: ZoneDto[];
	items?: ZoneDto[];
	data?: ZoneDto[];
};

export type BinDto = {
	id?: number;
	bin_id?: number;
	warehouse_id: number;
	zone_id?: number | null;
	bin_code?: string;
	code?: string;
	bin_barcode?: string | null;
	barcode?: string | null;
	bin_type?: string;
};

export type BinListResponseDto = {
	bins?: BinDto[];
	items?: BinDto[];
	data?: BinDto[];
};
