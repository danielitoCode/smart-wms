export type AuditLogEntryDto = {
	log_id: number;
	action_type: string;
	entity_type: string;
	entity_id?: string | number | null;
	user_id?: number | null;
	username?: string | null;
	warehouse_id?: number | null;
	device_id?: string | null;
	details?: unknown;
	created_at?: string | null;
};

export type AuditLogListResponseDto = {
	entries?: AuditLogEntryDto[];
	logs?: AuditLogEntryDto[];
	page?: number;
	per_page?: number;
	total?: number;
};
