import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { FraudReviewRemoteDataSource } from '../../../../../core/feature/fraud/data/datasource/FraudReviewRemoteDataSource';

describe('FraudReviewRemoteDataSource', () => {
  it('scopes the fraud list and forwards search plus page', async () => {
    const api = { get: vi.fn().mockResolvedValue({ sales_orders: [], page: 2, per_page: 50, total: 51, pages: 2 }) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);
    await source.list(8, ' SO-42 ', 2);
    const url = new URL(String(vi.mocked(api.get).mock.calls[0][0]), 'http://localhost');
    expect(url.pathname).toBe('/api/admin/sales-orders');
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      status: 'FRAUD_REVIEW', warehouse_id: '8', page: '2', per_page: '50', q: 'SO-42'
    });
  });

  it('loads the existing sales-order detail endpoint', async () => {
    const api = { get: vi.fn().mockResolvedValue({ sales_order: {}, lines: [] }) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);
    await source.getDetail(19);
    expect(api.get).toHaveBeenCalledWith('/api/admin/sales-orders/19');
  });

  it('loads the order audit history with pagination', async () => {
    const api = { get: vi.fn().mockResolvedValue({ entries: [], page: 1, per_page: 20, total: 0, pages: 1 }) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);
    await source.getAuditHistory(19, 3);
    expect(api.get).toHaveBeenCalledWith('/api/admin/sales-orders/19/audit-history?page=3&per_page=20');
  });

  it('sends the expected memo value for optimistic concurrency', async () => {
    const api = { request: vi.fn().mockResolvedValue(undefined) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);
    await source.updateMemo(19, 'new note', 'old note');
    expect(api.request).toHaveBeenCalledWith('/api/admin/sales-orders/19/memo', {
      method: 'PATCH', body: { memo: 'new note', expected_memo: 'old note' }
    });
  });

  it('uses the push-to-queue POST contract', async () => {
    const api = { post: vi.fn().mockResolvedValue(undefined) } as unknown as ApiClient;
    const source = new FraudReviewRemoteDataSource(api);
    await source.pushToQueue(19);
    expect(api.post).toHaveBeenCalledWith('/api/admin/sales-orders/19/push-to-queue');
  });
});
