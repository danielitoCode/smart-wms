import { describe, expect, it, vi } from 'vitest';
import type { ConsumerGroupsRepository } from '#core/feature/consumer-groups/domain/repository/ConsumerGroupsRepository';
import {
  CreateConnectorUseCase, CreateConsumerGroupUseCase, UpdateConsumerGroupUseCase,
  UpdateConnectorUseCase, DeleteConnectorUseCase
} from '#core/feature/consumer-groups/domain/usecase/ConsumerGroupsUseCases';

const repository = {
  createConnector: vi.fn(), createGroup: vi.fn(), updateGroup: vi.fn(),
  updateConnector: vi.fn(), removeConnector: vi.fn()
} as unknown as ConsumerGroupsRepository;

describe('Consumer Groups domain rules', () => {
  it('rejects blank and oversized connector identifiers and names', () => {
    expect(() => new CreateConnectorUseCase(repository).execute({ connectorId: ' ', displayName: 'ERP' })).toThrow();
    expect(() => new CreateConnectorUseCase(repository).execute({ connectorId: 'erp', displayName: 'x'.repeat(129) })).toThrow();
    expect(repository.createConnector).not.toHaveBeenCalled();
  });
  it('rejects invalid or extra subscription fields before persistence', () => {
    const create = new CreateConsumerGroupUseCase(repository);
    expect(() => create.execute({ consumerGroupId: 'g', connectorId: 'c', subscription: { eventTypes: 'bad' as never } })).toThrow();
    expect(() => create.execute({ consumerGroupId: 'g', connectorId: 'c', subscription: { extra: [] } as never })).toThrow();
    expect(() => create.execute({ consumerGroupId: 'g', connectorId: 'c', subscription: { warehouseIds: [1.5] } })).toThrow();
    expect(repository.createGroup).not.toHaveBeenCalled();
  });
  it('accepts valid subscriptions and explicit replay acknowledgement', () => {
    new CreateConsumerGroupUseCase(repository).execute({
      consumerGroupId: 'group-a', connectorId: 'erp',
      subscription: { eventTypes: ['order.created'], warehouseIds: [2, 5] }, acknowledgeReplay: true
    });
    expect(repository.createGroup).toHaveBeenCalledWith(expect.objectContaining({
      acknowledgeReplay: true, subscription: { eventTypes: ['order.created'], warehouseIds: [2, 5] }
    }));
  });
  it('does not expose connector identity or cursor as editable group fields', () => {
    new UpdateConsumerGroupUseCase(repository).execute({ consumerGroupId: 'g', subscription: {} });
    expect(repository.updateGroup).toHaveBeenCalledWith({ consumerGroupId: 'g', subscription: {} });
  });
  it('allows updating only connector display name and deleting by immutable ID', () => {
    new UpdateConnectorUseCase(repository).execute({ connectorId: 'erp', displayName: 'ERP Prod' });
    new DeleteConnectorUseCase(repository).execute('erp');
    expect(repository.updateConnector).toHaveBeenCalledWith({ connectorId: 'erp', displayName: 'ERP Prod' });
    expect(repository.removeConnector).toHaveBeenCalledWith('erp');
  });
});
