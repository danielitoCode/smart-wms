import { describe, expect, it, vi } from 'vitest';
import { ReturnsRemoteDataSource } from '../../../../../core/feature/returns/data/datasource/ReturnsRemoteDataSource';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

describe('ReturnsRemoteDataSource', () => {
  it('requests the RMA receipt history from the dedicated endpoint', async () => {
    const get = vi.fn().mockResolvedValue({ receipts: [{ receipt_id: 1 }] });
    const source = new ReturnsRemoteDataSource({ get } as unknown as ApiClient);
    await expect(source.receipts(42)).resolves.toEqual([{ receipt_id: 1 }]);
    expect(get).toHaveBeenCalledWith('/api/admin/sales-orders/42/return-receipts');
  });

  it('keeps the list scoped to return orders and trims search', async () => {
    const get = vi.fn().mockResolvedValue({ sales_orders: [] });
    const source = new ReturnsRemoteDataSource({ get } as unknown as ApiClient);
    await source.list({ search: ' RMA-4 ' });
    expect(get).toHaveBeenCalledWith(expect.stringContaining('order_type=return'));
    expect(get).toHaveBeenCalledWith(expect.stringContaining('q=RMA-4'));
  });
});
