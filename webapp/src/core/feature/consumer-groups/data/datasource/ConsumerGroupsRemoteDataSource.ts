import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type {
  ConsumerGroupDto, ConsumerGroupListResponseDto, ConnectorRegistryDto,
  ConnectorRegistryListResponseDto, SubscriptionFilterDto
} from '../dto/ConsumerGroupDto';

export class ConsumerGroupsRemoteDataSource {
  constructor(private readonly api: ApiClient) {}
  listGroups() { return this.api.get<ConsumerGroupListResponseDto>('/api/admin/consumer-groups'); }
  listRegistry() { return this.api.get<ConnectorRegistryListResponseDto>('/api/admin/connector-registry'); }
  createConnector(body: { connector_id: string; display_name: string }) {
    return this.api.post<ConnectorRegistryDto>('/api/admin/connector-registry', body);
  }
  updateConnector(id: string, body: { display_name: string }) {
    return this.api.patch<ConnectorRegistryDto>(`/api/admin/connector-registry/${encodeURIComponent(id)}`, body);
  }
  removeConnector(id: string) {
    return this.api.delete<{ connector_id: string; deleted: boolean }>(`/api/admin/connector-registry/${encodeURIComponent(id)}`);
  }
  createGroup(body: { consumer_group_id: string; connector_id: string; subscription: SubscriptionFilterDto; acknowledge_replay: boolean }) {
    return this.api.post<ConsumerGroupDto>('/api/admin/consumer-groups', body);
  }
  updateGroup(id: string, body: { subscription: SubscriptionFilterDto }) {
    return this.api.patch<ConsumerGroupDto>(`/api/admin/consumer-groups/${encodeURIComponent(id)}`, body);
  }
  removeGroup(id: string) {
    return this.api.delete<void>(`/api/admin/consumer-groups/${encodeURIComponent(id)}`);
  }
}
