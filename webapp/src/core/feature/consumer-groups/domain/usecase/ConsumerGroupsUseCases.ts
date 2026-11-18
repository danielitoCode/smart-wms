import type {
  ConnectorCreateInput, ConnectorUpdateInput, ConsumerGroupCreateInput, ConsumerGroupUpdateInput,
  SubscriptionFilter
} from '../entity/ConsumerGroup';
import type { ConsumerGroupsRepository } from '../repository/ConsumerGroupsRepository';

function required(value: string, label: string, max = 64) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} es obligatorio`);
  if (normalized.length > max) throw new Error(`${label} supera ${max} caracteres`);
  return normalized;
}

export function validateSubscription(value: SubscriptionFilter): SubscriptionFilter {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('La suscripción debe ser un objeto');
  const allowed = new Set(['eventTypes', 'warehouseIds']);
  if (Object.keys(value).some(key => !allowed.has(key))) throw new Error('La suscripción contiene campos no permitidos');
  if (value.eventTypes !== undefined && (!Array.isArray(value.eventTypes) || value.eventTypes.length > 64 || value.eventTypes.some(v => typeof v !== 'string'))) {
    throw new Error('event_types debe ser una lista de hasta 64 textos');
  }
  if (value.warehouseIds !== undefined && (!Array.isArray(value.warehouseIds) || value.warehouseIds.length > 64 || value.warehouseIds.some(v => !Number.isInteger(v)))) {
    throw new Error('warehouse_ids debe ser una lista de hasta 64 enteros');
  }
  return {
    ...(value.eventTypes !== undefined ? { eventTypes: value.eventTypes.map(v => v.trim()) } : {}),
    ...(value.warehouseIds !== undefined ? { warehouseIds: [...value.warehouseIds] } : {})
  };
}

export class ListConsumerGroupsUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute() { return this.repository.listGroups(); }
}
export class ListConnectorRegistryUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute() { return this.repository.listRegistry(); }
}
export class CreateConnectorUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute(input: ConnectorCreateInput) {
    return this.repository.createConnector({
      connectorId: required(input.connectorId, 'Connector ID'),
      displayName: required(input.displayName, 'Nombre visible', 128)
    });
  }
}
export class UpdateConnectorUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute(input: ConnectorUpdateInput) {
    return this.repository.updateConnector({
      connectorId: required(input.connectorId, 'Connector ID'),
      displayName: required(input.displayName, 'Nombre visible', 128)
    });
  }
}
export class DeleteConnectorUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute(id: string) { return this.repository.removeConnector(required(id, 'Connector ID')); }
}
export class CreateConsumerGroupUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute(input: ConsumerGroupCreateInput) {
    return this.repository.createGroup({
      consumerGroupId: required(input.consumerGroupId, 'Consumer group ID'),
      connectorId: required(input.connectorId, 'Conector'),
      subscription: validateSubscription(input.subscription ?? {}),
      acknowledgeReplay: input.acknowledgeReplay === true
    });
  }
}
export class UpdateConsumerGroupUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute(input: ConsumerGroupUpdateInput) {
    return this.repository.updateGroup({
      consumerGroupId: required(input.consumerGroupId, 'Consumer group ID'),
      subscription: validateSubscription(input.subscription)
    });
  }
}
export class DeleteConsumerGroupUseCase {
  constructor(private readonly repository: ConsumerGroupsRepository) {}
  execute(id: string) { return this.repository.removeGroup(required(id, 'Consumer group ID')); }
}
