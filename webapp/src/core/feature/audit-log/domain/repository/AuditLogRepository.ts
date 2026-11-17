import type { AuditEvent, AuditLogQuery } from '../entity/AuditLogEntry';

export type AuditLogPage = {
	rows: AuditEvent[];
	page: number;
	perPage: number;
	total: number;
	pages: number;
};

export interface AuditLogRepository {
	list(query?: AuditLogQuery): Promise<AuditLogPage>;
}
