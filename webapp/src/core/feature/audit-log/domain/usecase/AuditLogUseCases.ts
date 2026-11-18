import type { AuditLogRepository } from '../repository/AuditLogRepository';
import type { AuditLogQuery } from '../entity/AuditLogEntry';

export class ListAuditLogUseCase {
	constructor(private readonly repository: AuditLogRepository) {}

	async execute(query: AuditLogQuery = {}) {
		const page = query.page ?? 1;
		const perPage = query.perPage ?? 50;
		if (!Number.isInteger(page) || page < 1) throw new Error('La página debe ser un entero >= 1');
		if (!Number.isInteger(perPage) || perPage < 1 || perPage > 1000) {
			throw new Error('perPage debe estar entre 1 y 1000');
		}
		if (query.itemId !== undefined && (!Number.isInteger(query.itemId) || query.itemId < 1)) {
			throw new Error('itemId debe ser un entero positivo');
		}
		if (query.startDate && query.endDate && query.startDate > query.endDate) {
			throw new Error('La fecha inicial no puede ser posterior a la fecha final');
		}
		return this.repository.list({ ...query, page, perPage });
	}
}

export class FilterAuditLogUseCase {
	constructor(private readonly listAuditLog: ListAuditLogUseCase) {}
	async execute(query: AuditLogQuery) { return this.listAuditLog.execute({ ...query, page: 1 }); }
}
