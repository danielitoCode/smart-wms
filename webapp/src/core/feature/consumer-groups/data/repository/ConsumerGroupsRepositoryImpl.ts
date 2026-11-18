import type { ConsumerGroupsRepository } from '../../domain/repository/ConsumerGroupsRepository';
import type {
  ConnectorCreateInput, ConnectorRegistryEntry, ConnectorUpdateInput, ConsumerGroup,
  ConsumerGroupCreateInput, ConsumerGroupUpdateInput
} from '../../domain/entity/ConsumerGroup';
import { ConsumerGroupsRemoteDataSource } from '../datasource/ConsumerGroupsRemoteDataSource';
import { ConsumerGroupMapper } from '../mapper/ConsumerGroupMapper';

export class ConsumerGroupsRepositoryImpl implements ConsumerGroupsRepository {
  constructor(private readonly remote: ConsumerGroupsRemoteDataSource) {}
  async listGroups(): Promise<ConsumerGroup[]> {
    const response = await this.remote.listGroups();
    return response.consumer_groups.map(ConsumerGroupMapper.toGroup);
  }
  async listRegistry(): Promise<ConnectorRegistryEntry[]> {
    const response = await this.remote.listRegistry();
    return response.connectors.map(ConsumerGroupMapper.toRegistry);
  }
  async createConnector(input: ConnectorCreateInput) {
    return ConsumerGroupMapper.toRegistry(await this.remote.createConnector({
      connector_id: input.connectorId, display_name: input.displayName
    }));
  }
  async updateConnector(input: ConnectorUpdateInput) {
    return ConsumerGroupMapper.toRegistry(await this.remote.updateConnector(input.connectorId, {
      display_name: input.displayName
    }));
  }
  async removeConnector(id: string) { await this.remote.removeConnector(id); }
  async createGroup(input: ConsumerGroupCreateInput) {
    return ConsumerGroupMapper.toGroup(await this.remote.createGroup({
      consumer_group_id: input.consumerGroupId,
      connector_id: input.connectorId,
      subscription: ConsumerGroupMapper.subscriptionToDto(input.subscription),
      acknowledge_replay: input.acknowledgeReplay === true
    }));
  }
  async updateGroup(input: ConsumerGroupUpdateInput) {
    return ConsumerGroupMapper.toGroup(await this.remote.updateGroup(input.consumerGroupId, {
      subscription: ConsumerGroupMapper.subscriptionToDto(input.subscription)
    }));
  }
  async removeGroup(id: string) { await this.remote.removeGroup(id); }
}
