export type AuditLogEntry = {
	logId: number;
	actionType: string;
	entityType: string;
	entityId: string | number | null;
	userId: number | null;
	username: string | null;
	warehouseId: number | null;
	deviceId: string | null;
	details: unknown;
	createdAt: string | null;
};

export type AuditLogQuery = {
	actionType?: string;
	entityType?: string;
	userId?: number;
	warehouseId?: number | null;
	from?: string;
	to?: string;
	page?: number;
	perPage?: number;
};
