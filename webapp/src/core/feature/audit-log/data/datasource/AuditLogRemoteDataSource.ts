import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { AuditLogQuery } from '../../domain/entity/AuditLogEntry';
import type { AuditLogListResponseDto } from '../dto/AuditLogDto';

export class AuditLogRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async list(query: AuditLogQuery = {}): Promise<AuditLogListResponseDto> {
		const params = new URLSearchParams({
			page: String(query.page ?? 1),
			per_page: String(query.perPage ?? 50)
		});
		if (query.actionType) params.set('action_type', query.actionType);
		if (query.entityType) params.set('entity_type', query.entityType);
		if (query.userId != null) params.set('user_id', String(query.userId));
		if (query.warehouseId != null) params.set('warehouse_id', String(query.warehouseId));
		if (query.from) params.set('from', query.from);
		if (query.to) params.set('to', query.to);
		return this.api.get<AuditLogListResponseDto>(`/api/admin/audit-log?${params}`);
	}
}
