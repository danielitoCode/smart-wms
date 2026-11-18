import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { ConsumerGroupsRemoteDataSource } from '#core/feature/consumer-groups/data/datasource/ConsumerGroupsRemoteDataSource';
import { ConsumerGroupMapper } from '#core/feature/consumer-groups/data/mapper/ConsumerGroupMapper';

describe('Consumer Groups Flask contracts', () => {
  it('maps the real connector registry DTO, without invented name or description fields', () => {
    const mapped = ConsumerGroupMapper.toRegistry({ connector_id: 'erp', display_name: 'ERP Production', created_at: '2026-11-17', updated_at: null });
    expect(mapped).toEqual({ connectorId: 'erp', displayName: 'ERP Production', createdAt: '2026-11-17', updatedAt: null });
  });
  it('maps cursor, heartbeat and subscription without inventing a backend status', () => {
    const mapped = ConsumerGroupMapper.toGroup({
      consumer_group_id: 'erp-main', connector_id: 'erp', last_cursor: 12,
      last_heartbeat: null, subscription: { event_types: ['order.created'], warehouse_ids: [4] },
      created_at: '2026-11-17', updated_at: null
    });
    expect(mapped).toMatchObject({ consumerGroupId: 'erp-main', connectorId: 'erp', lastCursor: 12, lastHeartbeat: null, subscription: { eventTypes: ['order.created'], warehouseIds: [4] } });
    expect(mapped).not.toHaveProperty('status');
  });
  it('uses the distinct registry and group endpoints and exact request keys', async () => {
    const get = vi.fn().mockResolvedValueOnce({ connectors: [] }).mockResolvedValueOnce({ consumer_groups: [] });
    const post = vi.fn().mockResolvedValue({ consumer_group_id: 'g', connector_id: 'erp', last_cursor: 0, last_heartbeat: null, subscription: {}, created_at: null, updated_at: null });
    const patch = vi.fn().mockResolvedValue({ connector_id: 'erp', display_name: 'ERP', created_at: null, updated_at: null });
    const remove = vi.fn().mockResolvedValue(undefined);
    const api = { get, post, patch, delete: remove } as unknown as ApiClient;
    const source = new ConsumerGroupsRemoteDataSource(api);
    await source.listRegistry(); await source.listGroups();
    expect(get).toHaveBeenNthCalledWith(1, '/api/admin/connector-registry');
    expect(get).toHaveBeenNthCalledWith(2, '/api/admin/consumer-groups');
    await source.createGroup({ consumer_group_id: 'g', connector_id: 'erp', subscription: { event_types: ['x'] }, acknowledge_replay: true });
    expect(post).toHaveBeenCalledWith('/api/admin/consumer-groups', { consumer_group_id: 'g', connector_id: 'erp', subscription: { event_types: ['x'] }, acknowledge_replay: true });
    await source.updateConnector('erp', { display_name: 'ERP' });
    expect(patch).toHaveBeenCalledWith('/api/admin/connector-registry/erp', { display_name: 'ERP' });
    await source.removeConnector('erp');
    await source.updateGroup('g', { subscription: { warehouse_ids: [1] } });
    await source.removeGroup('g');
    expect(remove).toHaveBeenCalledTimes(2);
  });
  it('preserves duplicate, unknown connector, in-use and validation API failures', async () => {
    const conflict = Object.assign(new Error('duplicate_consumer_group_id'), { status: 409 });
    const missing = Object.assign(new Error('unknown_connector_id'), { status: 400 });
    const inUse = Object.assign(new Error('connector_in_use'), { status: 409 });
    const invalid = Object.assign(new Error('validation_error'), { status: 400 });
    const post = vi.fn().mockRejectedValueOnce(conflict).mockRejectedValueOnce(missing).mockRejectedValueOnce(inUse).mockRejectedValueOnce(invalid);
    const source = new ConsumerGroupsRemoteDataSource({ post } as unknown as ApiClient);
    await expect(source.createGroup({ consumer_group_id: 'x', connector_id: 'c', subscription: {}, acknowledge_replay: false })).rejects.toThrow('duplicate_consumer_group_id');
    await expect(source.createGroup({ consumer_group_id: 'x', connector_id: 'missing', subscription: {}, acknowledge_replay: false })).rejects.toThrow('unknown_connector_id');
    await expect(source.createGroup({ consumer_group_id: 'x', connector_id: 'c', subscription: {}, acknowledge_replay: false })).rejects.toThrow('connector_in_use');
    await expect(source.createGroup({ consumer_group_id: 'x', connector_id: 'c', subscription: {}, acknowledge_replay: false })).rejects.toThrow('validation_error');
  });
});
