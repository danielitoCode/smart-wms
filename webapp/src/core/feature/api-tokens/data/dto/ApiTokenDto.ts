export type ApiTokenDto = {
	token_id: number;
	token_name: string;
	warehouse_ids?: number[] | null;
	event_types?: string[] | null;
	endpoints?: string[] | null;
	connector_id?: string | null;
	status: string;
	source_system?: string | null;
	inbound_resources?: string[] | null;
	mapping_override?: boolean | null;
	mapping_overrides_keys?: string[] | null;
	rotation_status?: string | null;
	created_at?: string | null;
	rotated_at?: string | null;
	expires_at?: string | null;
	revoked_at?: string | null;
	last_used_at?: string | null;
	/** Present only in create/rotate responses; never in list responses. */
	token?: string;
};

export type ApiTokenListResponseDto = { tokens: ApiTokenDto[] };

export type ScopeCatalogDto = {
	event_types: string[];
	endpoints: string[];
	inbound_resources: string[];
	source_systems: Array<{ source_system: string; kind: string }>;
};

export type WarehouseOptionDto = {
	warehouse_id: number;
	warehouse_code: string;
	warehouse_name?: string | null;
};

export type WarehousesResponseDto = { warehouses: WarehouseOptionDto[] };
