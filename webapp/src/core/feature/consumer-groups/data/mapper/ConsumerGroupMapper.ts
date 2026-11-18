import type { ConnectorRegistryEntry, ConsumerGroup } from '../../domain/entity/ConsumerGroup';
import type { ConnectorRegistryDto, ConsumerGroupDto } from '../dto/ConsumerGroupDto';

export const ConsumerGroupMapper = {
	toGroup(dto: ConsumerGroupDto): ConsumerGroup {
		return {
			consumerGroupId: dto.consumer_group_id,
			name: dto.name,
			connectorId: dto.connector_id ?? null,
			status: dto.status ?? 'unknown',
			createdAt: dto.created_at ?? null
		};
	},
	toRegistry(dto: ConnectorRegistryDto): ConnectorRegistryEntry {
		return {
			connectorId: dto.connector_id,
			name: dto.name,
			description: dto.description ?? null
		};
	}
};
