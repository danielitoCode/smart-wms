import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { FraudReviewRemoteDataSource } from '../../../../../core/feature/fraud/data/datasource/FraudReviewRemoteDataSource';

describe('FraudReviewRemoteDataSource', () => {
  it('always scopes the fraud list to the selected warehouse and serializes search', async () => {
    const api = { get: vi.fn().mockResolvedValue({ sales_orders: [] }) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);

    await source.list(8, ' SO-42 ');

    const url = new URL(String(vi.mocked(api.get).mock.calls[0][0]), 'http://localhost');
    expect(url.pathname).toBe('/api/admin/sales-orders');
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      status: 'FRAUD_REVIEW',
      warehouse_id: '8',
      per_page: '100',
      q: 'SO-42'
    });
  });

  it('loads the sales-order detail from the existing detail endpoint', async () => {
    const api = { get: vi.fn().mockResolvedValue({ sales_order: {}, lines: [] }) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);
    await source.getDetail(19);
    expect(api.get).toHaveBeenCalledWith('/api/admin/sales-orders/19');
  });

  it('uses the dedicated memo PATCH and push-to-queue POST contracts', async () => {
    const api = {
      request: vi.fn().mockResolvedValue(undefined),
      post: vi.fn().mockResolvedValue(undefined)
    } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);

    await source.updateMemo(19, '');
    await source.pushToQueue(19);

    expect(api.request).toHaveBeenCalledWith('/api/admin/sales-orders/19/memo', {
      method: 'PATCH', body: { memo: '' }
    });
    expect(api.post).toHaveBeenCalledWith('/api/admin/sales-orders/19/push-to-queue');
  });
});
