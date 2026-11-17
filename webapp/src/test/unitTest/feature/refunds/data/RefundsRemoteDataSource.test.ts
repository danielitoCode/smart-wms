import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { RefundsRemoteDataSource } from '../../../../../core/feature/refunds/data/datasource/RefundsRemoteDataSource';

describe('RefundsRemoteDataSource', () => {
  it('lists only refund credit memos with supported read filters', async () => {
    const api = { get: vi.fn().mockResolvedValue({ sales_orders: [] }) } as unknown as ApiClient;
    const source = new RefundsRemoteDataSource(api);
    await source.list({ status: 'SHIPPED', search: ' REF-1 ' });
    const url = new URL(String(vi.mocked(api.get).mock.calls[0][0]), 'http://localhost');
    expect(url.pathname).toBe('/api/admin/sales-orders');
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      order_type: 'refund', per_page: '100', status: 'SHIPPED', q: 'REF-1'
    });
  });

  it('reads detail and the original order family without exposing refund mutations', async () => {
    const api = { get: vi.fn().mockResolvedValue({}) } as unknown as ApiClient;
    const source = new RefundsRemoteDataSource(api);
    await source.detail(17);
    await source.related(17);
    expect(api.get).toHaveBeenNthCalledWith(1, '/api/admin/sales-orders/17');
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/admin/sales-orders/17/related');
    expect(Object.getOwnPropertyNames(RefundsRemoteDataSource.prototype)).toEqual(['constructor', 'list', 'detail', 'related']);
  });
});
