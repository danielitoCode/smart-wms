import type { ConnectorRegistryEntry, ConsumerGroup, ConsumerGroupCreateInput } from '../entity/ConsumerGroup';

export interface ConsumerGroupsRepository {
	listGroups(): Promise<ConsumerGroup[]>;
	listRegistry(): Promise<ConnectorRegistryEntry[]>;
	createGroup(input: ConsumerGroupCreateInput): Promise<ConsumerGroup>;
	removeGroup(consumerGroupId: string): Promise<void>;
}
