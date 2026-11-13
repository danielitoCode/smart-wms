import type { AuditLogEntry, AuditLogQuery } from '../entity/AuditLogEntry';

export type AuditLogPage = {
	rows: AuditLogEntry[];
	page: number;
	perPage: number;
	total: number;
};

export interface AuditLogRepository {
	list(query?: AuditLogQuery): Promise<AuditLogPage>;
}
