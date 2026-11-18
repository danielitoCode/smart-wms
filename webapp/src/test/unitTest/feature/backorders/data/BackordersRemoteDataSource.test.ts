import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { BackordersRemoteDataSource } from '../../../../../core/feature/backorders/data/datasource/BackordersRemoteDataSource';

function createApi() {
  return {
    get: vi.fn().mockResolvedValue({ backorders: [] }),
    post: vi.fn().mockResolvedValue({
      message: 'Backorder cancelled', bo_so_id: 41, cancellation_reason: 'refunded', audit_log_id: 8
    })
  } as unknown as ApiClient;
}

describe('BackordersRemoteDataSource', () => {
  it('requests the waiting queue scoped to the selected warehouse', async () => {
    const api = createApi();
    await new BackordersRemoteDataSource(api).list(3, 'waiting');
    expect(api.get).toHaveBeenCalledWith('/api/admin/backorders?tab=waiting&warehouse_id=3');
  });

  it('does not invent a warehouse filter when the caller explicitly requests an unscoped queue', async () => {
    const api = createApi();
    await new BackordersRemoteDataSource(api).list(null, 'ready-to-ship');
    expect(api.get).toHaveBeenCalledWith('/api/admin/backorders?tab=ready-to-ship');
  });

  it('posts the backend cancellation reason to the dedicated backorder route', async () => {
    const api = createApi();
    const response = await new BackordersRemoteDataSource(api).cancel(41, 'refunded');
    expect(api.post).toHaveBeenCalledWith(
      '/api/admin/sales-orders/41/cancel-backorder',
      { cancellation_reason: 'refunded' }
    );
    expect(response.bo_so_id).toBe(41);
    expect(response.cancellation_reason).toBe('refunded');
  });
});
