export type AuditLogEntryDto = {
	log_id: number;
	action_type: string;
	entity_type: string;
	entity_id?: string | number | null;
	entity_name?: string | null;
	username?: string | null;
	device_id?: string | null;
	warehouse_id?: number | null;
	warehouse_code?: string | null;
	details?: unknown;
	created_at?: string | null;
};

export type AuditLogListResponseDto = {
	entries: AuditLogEntryDto[];
	page: number;
	per_page: number;
	total: number;
	pages: number;
};
