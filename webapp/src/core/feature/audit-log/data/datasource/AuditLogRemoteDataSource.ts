import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { AuditLogQuery } from '../../domain/entity/AuditLogEntry';
import type { AuditLogListResponseDto } from '../dto/AuditLogDto';

export class AuditLogRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	list(query: AuditLogQuery = {}): Promise<AuditLogListResponseDto> {
		const params = new URLSearchParams({
			page: String(query.page ?? 1),
			per_page: String(query.perPage ?? 50),
			sort_by: query.sortBy ?? 'created_at',
			sort_direction: query.sortDirection ?? 'desc'
		});
		if (query.actionType?.trim()) params.set('action_type', query.actionType.trim());
		if (query.actor?.trim()) params.set('user_id', query.actor.trim());
		if (query.startDate) params.set('start_date', query.startDate);
		if (query.endDate) params.set('end_date', query.endDate);
		if (query.itemId !== undefined) params.set('item_id', String(query.itemId));
		return this.api.get<AuditLogListResponseDto>(`/api/admin/audit-log?${params.toString()}`);
	}
}
