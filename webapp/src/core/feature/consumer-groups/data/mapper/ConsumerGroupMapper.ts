import type { ConnectorRegistryEntry, ConsumerGroup, SubscriptionFilter } from '../../domain/entity/ConsumerGroup';
import type { ConnectorRegistryDto, ConsumerGroupDto, SubscriptionFilterDto } from '../dto/ConsumerGroupDto';

function subscriptionToDomain(dto: SubscriptionFilterDto | null | undefined): SubscriptionFilter {
  return {
    ...(dto?.event_types ? { eventTypes: [...dto.event_types] } : {}),
    ...(dto?.warehouse_ids ? { warehouseIds: [...dto.warehouse_ids] } : {})
  };
}
export const ConsumerGroupMapper = {
  toGroup(dto: ConsumerGroupDto): ConsumerGroup {
    return {
      consumerGroupId: dto.consumer_group_id,
      connectorId: dto.connector_id,
      lastCursor: dto.last_cursor,
      lastHeartbeat: dto.last_heartbeat,
      subscription: subscriptionToDomain(dto.subscription),
      createdAt: dto.created_at,
      updatedAt: dto.updated_at
    };
  },
  toRegistry(dto: ConnectorRegistryDto): ConnectorRegistryEntry {
    return {
      connectorId: dto.connector_id,
      displayName: dto.display_name,
      createdAt: dto.created_at,
      updatedAt: dto.updated_at
    };
  },
  subscriptionToDto(value: SubscriptionFilter): SubscriptionFilterDto {
    return {
      ...(value.eventTypes !== undefined ? { event_types: [...value.eventTypes] } : {}),
      ...(value.warehouseIds !== undefined ? { warehouse_ids: [...value.warehouseIds] } : {})
    };
  }
};
