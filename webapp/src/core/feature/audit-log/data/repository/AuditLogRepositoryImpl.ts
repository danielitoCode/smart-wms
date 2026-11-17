import type { AuditLogRepository, AuditLogPage } from '../../domain/repository/AuditLogRepository';
import type { AuditLogQuery } from '../../domain/entity/AuditLogEntry';
import { AuditLogRemoteDataSource } from '../datasource/AuditLogRemoteDataSource';
import { AuditLogMapper } from '../mapper/AuditLogMapper';

export class AuditLogRepositoryImpl implements AuditLogRepository {
	constructor(private readonly remote: AuditLogRemoteDataSource) {}

	async list(query: AuditLogQuery = {}): Promise<AuditLogPage> {
		const response = await this.remote.list(query);
		const rows = (response.entries ?? []).map(AuditLogMapper.toDomain);
		return {
			rows,
			page: response.page ?? query.page ?? 1,
			perPage: response.per_page ?? query.perPage ?? 50,
			total: response.total ?? rows.length,
			pages: response.pages ?? Math.max(1, Math.ceil((response.total ?? rows.length) / (response.per_page ?? query.perPage ?? 50)))
		};
	}
}
