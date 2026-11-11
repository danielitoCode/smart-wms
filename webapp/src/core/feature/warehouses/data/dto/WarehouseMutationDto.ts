export type CreateWarehouseRequestDto = {
	warehouse_code: string; warehouse_name: string; address?: string | null;
};
export type UpdateWarehouseRequestDto = {
	warehouse_name?: string; address?: string | null; is_active?: boolean;
};
export type CreateZoneRequestDto = {
	warehouse_id: number; zone_code: string; zone_name: string; zone_type: string;
};
export type UpdateZoneRequestDto = {
	zone_code?: string; zone_name?: string; zone_type?: string; is_active?: boolean;
};
export type CreateBinRequestDto = {
	zone_id: number; warehouse_id: number; bin_code: string; bin_barcode: string;
	bin_type: string; aisle?: string | null; pick_sequence?: number;
};
export type UpdateBinRequestDto = {
	zone_id?: number; bin_code?: string; bin_barcode?: string | null; bin_type?: string;
	aisle?: string | null; pick_sequence?: number; is_active?: boolean;
};
