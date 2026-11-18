import type {
  ConnectorCreateInput, ConnectorRegistryEntry, ConnectorUpdateInput, ConsumerGroup,
  ConsumerGroupCreateInput, ConsumerGroupUpdateInput
} from '../entity/ConsumerGroup';

export interface ConsumerGroupsRepository {
  listGroups(): Promise<ConsumerGroup[]>;
  listRegistry(): Promise<ConnectorRegistryEntry[]>;
  createConnector(input: ConnectorCreateInput): Promise<ConnectorRegistryEntry>;
  updateConnector(input: ConnectorUpdateInput): Promise<ConnectorRegistryEntry>;
  removeConnector(connectorId: string): Promise<void>;
  createGroup(input: ConsumerGroupCreateInput): Promise<ConsumerGroup>;
  updateGroup(input: ConsumerGroupUpdateInput): Promise<ConsumerGroup>;
  removeGroup(consumerGroupId: string): Promise<void>;
}
