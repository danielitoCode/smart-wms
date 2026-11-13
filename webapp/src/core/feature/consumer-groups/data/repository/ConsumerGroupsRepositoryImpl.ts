import type { ConsumerGroupsRepository } from '../../domain/repository/ConsumerGroupsRepository';
import type { ConnectorRegistryEntry, ConsumerGroup, ConsumerGroupCreateInput } from '../../domain/entity/ConsumerGroup';
import { ConsumerGroupsRemoteDataSource } from '../datasource/ConsumerGroupsRemoteDataSource';
import { ConsumerGroupMapper } from '../mapper/ConsumerGroupMapper';

export class ConsumerGroupsRepositoryImpl implements ConsumerGroupsRepository {
	constructor(private readonly remote: ConsumerGroupsRemoteDataSource) {}
	async listGroups() {
		const response = await this.remote.listGroups();
		const raw = response.consumer_groups ?? response.groups ?? [];
		return raw.map(ConsumerGroupMapper.toGroup);
	}
	async listRegistry() {
		const response = await this.remote.listRegistry();
		const raw = response.connectors ?? response.registry ?? [];
		return raw.map(ConsumerGroupMapper.toRegistry);
	}
	async createGroup(input: ConsumerGroupCreateInput) {
		const dto = await this.remote.createGroup({
			name: input.name,
			connector_id: input.connectorId ?? null
		});
		return ConsumerGroupMapper.toGroup(dto);
	}
	async removeGroup(consumerGroupId: string) {
		await this.remote.removeGroup(consumerGroupId);
	}
}
