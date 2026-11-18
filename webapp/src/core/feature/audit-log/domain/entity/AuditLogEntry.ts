export type AuditEvent = {
	logId: number;
	action: string;
	resourceType: string;
	resourceId: string | number | null;
	resourceName: string | null;
	actor: string | null;
	deviceId: string | null;
	warehouseId: number | null;
	warehouseCode: string | null;
	metadata: unknown | null;
	occurredAt: string | null;
};

export type AuditLogEntry = AuditEvent;

export type AuditLogQuery = {
	actionType?: string;
	actor?: string;
	itemId?: number;
	startDate?: string;
	endDate?: string;
	sortBy?: 'created_at' | 'action_type' | 'user_id' | 'entity_type';
	sortDirection?: 'asc' | 'desc';
	page?: number;
	perPage?: number;
};
