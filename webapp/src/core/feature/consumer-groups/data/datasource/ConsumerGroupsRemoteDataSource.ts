import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type {
	ConsumerGroupDto,
	ConsumerGroupListResponseDto,
	ConnectorRegistryListResponseDto
} from '../dto/ConsumerGroupDto';

export class ConsumerGroupsRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	listGroups() { return this.api.get<ConsumerGroupListResponseDto>('/api/admin/consumer-groups'); }
	listRegistry() { return this.api.get<ConnectorRegistryListResponseDto>('/api/admin/connector-registry'); }
	createGroup(body: Record<string, unknown>) { return this.api.post<ConsumerGroupDto>('/api/admin/consumer-groups', body); }
	removeGroup(id: string) { return this.api.delete<void>(`/api/admin/consumer-groups/${encodeURIComponent(id)}`); }
}
