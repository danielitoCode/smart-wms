import type { AuditLogRepository } from '../repository/AuditLogRepository';
import type { AuditLogQuery } from '../entity/AuditLogEntry';

export class ListAuditLogUseCase {
	constructor(private readonly repository: AuditLogRepository) {}

	execute(query: AuditLogQuery = {}) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;
		if (page < 1) throw new Error('La página debe ser >= 1');
		if (perPage < 1 || perPage > 200) throw new Error('perPage debe estar entre 1 y 200');
		return this.repository.list({ ...query, page, perPage });
	}
}
