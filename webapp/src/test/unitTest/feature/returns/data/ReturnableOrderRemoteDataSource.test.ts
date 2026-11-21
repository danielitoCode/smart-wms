import { describe, expect, it, vi } from 'vitest';
import { ReturnsRemoteDataSource } from '../../../../../core/feature/returns/data/datasource/ReturnsRemoteDataSource';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

describe('ReturnsRemoteDataSource return authorization contract', () => {
  it('searches only shipped original sales orders', async () => {
    const get = vi.fn().mockResolvedValue({ sales_orders: [] });
    const source = new ReturnsRemoteDataSource({ get } as unknown as ApiClient);
    await source.originals(' SO-10 ');
    expect(get).toHaveBeenCalledWith(expect.stringContaining('order_type=sale'));
    expect(get).toHaveBeenCalledWith(expect.stringContaining('status=SHIPPED'));
    expect(get).toHaveBeenCalledWith(expect.stringContaining('q=SO-10'));
  });

  it('subtracts quantities authorized by every non-voided RMA child', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({ sales_order: { so_id: 10, so_number: 'SO-10', order_type: 'sale', status: 'SHIPPED', warehouse_id: 2, customer_name: 'A' }, lines: [
        { so_line_id: 100, item_id: 4, sku: 'SKU-4', item_name: 'Widget', quantity_shipped: 5 }
      ] })
      .mockResolvedValueOnce({ records: [
        { so_id: 10, order_type: 'sale', is_voided: false },
        { so_id: 20, order_type: 'return', is_voided: false },
        { so_id: 21, order_type: 'return', is_voided: true }
      ] })
      .mockResolvedValueOnce({ sales_order: { so_id: 20, order_type: 'return' }, lines: [
        { original_so_line_id: 100, quantity_ordered: 2 }
      ] });
    const source = new ReturnsRemoteDataSource({ get } as unknown as ApiClient);
    const result = await source.returnableOrder(10);
    expect(result.lines[0]).toMatchObject({
      originalSalesOrderLineId: 100, quantityShipped: 5,
      quantityAlreadyAuthorized: 2, quantityRemaining: 3
    });
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).not.toHaveBeenCalledWith('/api/admin/sales-orders/21');
  });

  it('posts the selected original-line references to create-rma', async () => {
    const post = vi.fn().mockResolvedValue({ so_id: 30, so_number: 'SO-10-RMA' });
    const source = new ReturnsRemoteDataSource({ post } as unknown as ApiClient);
    await source.createReturn(10, { lines: [{ item_id: 4, quantity: 2, original_so_line_id: 100 }] });
    expect(post).toHaveBeenCalledWith('/api/admin/sales-orders/10/create-rma', {
      lines: [{ item_id: 4, quantity: 2, original_so_line_id: 100 }]
    });
  });
});
