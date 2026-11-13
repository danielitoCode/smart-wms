import type { AuditLogRepository, AuditLogPage } from '../../domain/repository/AuditLogRepository';
import type { AuditLogQuery } from '../../domain/entity/AuditLogEntry';
import { AuditLogRemoteDataSource } from '../datasource/AuditLogRemoteDataSource';
import { AuditLogMapper } from '../mapper/AuditLogMapper';

export class AuditLogRepositoryImpl implements AuditLogRepository {
	constructor(private readonly remote: AuditLogRemoteDataSource) {}

	async list(query: AuditLogQuery = {}): Promise<AuditLogPage> {
		const response = await this.remote.list(query);
		const raw = response.entries ?? response.logs ?? [];
		return {
			rows: raw.map(AuditLogMapper.toDomain),
			page: response.page ?? query.page ?? 1,
			perPage: response.per_page ?? query.perPage ?? 50,
			total: response.total ?? raw.length
		};
	}
}
