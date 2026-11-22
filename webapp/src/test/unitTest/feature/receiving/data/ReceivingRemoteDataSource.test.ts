import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { ReceivingRemoteDataSource } from '../../../../../../core/feature/receiving/data/datasource/ReceivingRemoteDataSource';

describe('ReceivingRemoteDataSource receipt administration contracts', () => {
  it('loads the receipt history through the receiving page grant endpoint', async () => {
    const get = vi.fn().mockResolvedValue({ po_id: 12, receipts: [] });
    const api = { get } as unknown as ApiClient;
    const source = new ReceivingRemoteDataSource(api);
    await source.listReceipts(12);
    expect(get).toHaveBeenCalledWith('/api/admin/purchase-orders/12/receipts');
  });

  it('posts an individual unreceive with the optional reason', async () => {
    const post = vi.fn().mockResolvedValue({ receipt_id: 8, po_id: 12, po_status: 'PARTIAL', quantity_reversed: 4, bin_decrements: [] });
    const api = { post } as unknown as ApiClient;
    const source = new ReceivingRemoteDataSource(api);
    await source.unreceive(8, 'double scan');
    expect(post).toHaveBeenCalledWith('/api/admin/receipts/8/unreceive', { reason: 'double scan' });
  });

  it('omits an empty reason and preserves batch cancellation as a separate contract', async () => {
    const post = vi.fn().mockResolvedValue({});
    const api = { post } as unknown as ApiClient;
    const source = new ReceivingRemoteDataSource(api);
    await source.unreceive(8, '   ');
    await source.cancelReceipts(12, [8, 9]);
    expect(post).toHaveBeenNthCalledWith(1, '/api/admin/receipts/8/unreceive', {});
    expect(post).toHaveBeenNthCalledWith(2, '/api/receiving/cancel', { po_id: 12, receipt_ids: [8, 9] });
  });
});
