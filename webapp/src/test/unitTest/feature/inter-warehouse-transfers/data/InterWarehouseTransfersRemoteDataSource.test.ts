import { describe, expect, it, vi } from 'vitest';
import { InterWarehouseTransfersRemoteDataSource } from '../../../../../core/feature/inter-warehouse-transfers/data/datasource/InterWarehouseTransfersRemoteDataSource';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

describe('InterWarehouseTransfersRemoteDataSource', () => {
  it('sends source and destination filters to the server-side history scope', async () => {
    const api = { get: vi.fn().mockResolvedValue({ transfers: [] }) } as unknown as ApiClient;
    const source = new InterWarehouseTransfersRemoteDataSource(api);
    await expect(source.list(500, { fromWarehouseId: 4, toWarehouseId: 9 })).resolves.toEqual([]);
    expect(api.get).toHaveBeenCalledWith('/api/admin/inter-warehouse-transfers?limit=500&from_warehouse_id=4&to_warehouse_id=9');
  });

  it('clamps history limits to the backend contract', async () => {
    const api = { get: vi.fn().mockResolvedValue({ transfers: [] }) } as unknown as ApiClient;
    const source = new InterWarehouseTransfersRemoteDataSource(api);
    await source.list(900);
    expect(api.get).toHaveBeenCalledWith('/api/admin/inter-warehouse-transfers?limit=500');
  });

  it('posts the selected entities and idempotency key unchanged', async () => {
    const response = { transfer_id: 12, transfer_ids: [12], quantity: 2 };
    const api = { post: vi.fn().mockResolvedValue(response) } as unknown as ApiClient;
    const source = new InterWarehouseTransfersRemoteDataSource(api);
    const payload = {
      item_id: 7, from_bin_id: 11, from_warehouse_id: 1,
      to_bin_id: 22, to_warehouse_id: 2, quantity: 2,
      reason: 'replenishment', idempotency_key: '550e8400-e29b-41d4-a716-446655440000'
    };
    await expect(source.create(payload)).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith('/api/admin/inter-warehouse-transfer', payload);
  });
});
