import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { InboundActivityQuery } from '../../domain/entity/InboundActivity';
import type { InboundActivityDto, InboundActivityListResponseDto } from '../dto/InboundActivityDto';
export class InboundActivityRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	list(query: InboundActivityQuery = {}) {
		const params = new URLSearchParams({ page: String(query.page ?? 1), per_page: String(query.perPage ?? 50) });
		if (query.resource) params.set('resource', query.resource);
		if (query.sourceSystem?.trim()) params.set('source_system', query.sourceSystem.trim());
		if (query.status) params.set('status', query.status);
		if (query.since) params.set('since', query.since);
		if (query.until) params.set('until', query.until);
		return this.api.get<InboundActivityListResponseDto>(`/api/admin/inbound/activity?${params.toString()}`);
	}
	getDetail(resource: string, inboundId: number) {
		return this.api.get<InboundActivityDto>(`/api/admin/inbound/activity/${encodeURIComponent(resource)}/${inboundId}`);
	}
}
