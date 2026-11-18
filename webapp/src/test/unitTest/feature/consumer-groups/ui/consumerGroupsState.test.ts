import { describe, expect, it, vi } from 'vitest';
import { createConsumerGroupsState } from '#core/feature/consumer-groups/ui/state/consumerGroupsState.svelte';

function dependencies() {
  return {
    listGroups: { execute: vi.fn().mockResolvedValue([]) },
    listRegistry: { execute: vi.fn().mockResolvedValue([]) },
    createConnector: { execute: vi.fn().mockResolvedValue({ connectorId: 'erp' }) },
    updateConnector: { execute: vi.fn().mockResolvedValue({ connectorId: 'erp' }) },
    removeConnector: { execute: vi.fn().mockResolvedValue(undefined) },
    createGroup: { execute: vi.fn().mockResolvedValue({ consumerGroupId: 'g' }) },
    updateGroup: { execute: vi.fn().mockResolvedValue({ consumerGroupId: 'g' }) },
    removeGroup: { execute: vi.fn().mockResolvedValue(undefined) }
  };
}
describe('Consumer Groups presentation state', () => {
  it('loads registry and groups independently from their dedicated use cases', async () => {
    const deps = dependencies();
    const state = createConsumerGroupsState(deps as never);
    await state.load();
    expect(deps.listGroups.execute).toHaveBeenCalledOnce();
    expect(deps.listRegistry.execute).toHaveBeenCalledOnce();
  });
  it('exposes all CRUD actions without conflating registry and group mutations', async () => {
    const deps = dependencies();
    const state = createConsumerGroupsState(deps as never);
    await expect(state.createConnector({ connectorId: 'erp', displayName: 'ERP' })).resolves.toBe(true);
    await expect(state.updateConnector({ connectorId: 'erp', displayName: 'ERP 2' })).resolves.toBe(true);
    await expect(state.createGroup({ consumerGroupId: 'g', connectorId: 'erp', subscription: {} })).resolves.toBe(true);
    await expect(state.updateGroup({ consumerGroupId: 'g', subscription: { warehouseIds: [2] } })).resolves.toBe(true);
    await expect(state.removeGroup('g')).resolves.toBe(true);
    await expect(state.removeConnector('erp')).resolves.toBe(true);
    expect(deps.createConnector.execute).toHaveBeenCalledOnce();
    expect(deps.updateConnector.execute).toHaveBeenCalledOnce();
    expect(deps.createGroup.execute).toHaveBeenCalledOnce();
    expect(deps.updateGroup.execute).toHaveBeenCalledOnce();
    expect(deps.removeGroup.execute).toHaveBeenCalledOnce();
    expect(deps.removeConnector.execute).toHaveBeenCalledOnce();
  });
  it('surfaces duplicate IDs, unknown connectors and connector-in-use conflicts', async () => {
    const deps = dependencies();
    deps.createGroup.execute.mockRejectedValueOnce(new Error('duplicate_consumer_group_id'));
    deps.createGroup.execute.mockRejectedValueOnce(new Error('unknown_connector_id'));
    deps.removeConnector.execute.mockRejectedValueOnce(new Error('connector_in_use'));
    const state = createConsumerGroupsState(deps as never);
    expect(await state.createGroup({ consumerGroupId: 'dup', connectorId: 'erp', subscription: {} })).toBe(false);
    expect(state.error).toContain('duplicate_consumer_group_id');
    expect(await state.createGroup({ consumerGroupId: 'orphan', connectorId: 'missing', subscription: {} })).toBe(false);
    expect(state.error).toContain('unknown_connector_id');
    expect(await state.removeConnector('erp')).toBe(false);
    expect(state.error).toContain('connector_in_use');
  });
});
