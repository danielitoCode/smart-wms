import { describe, expect, it, vi } from 'vitest';
import { SalesOrderRemoteDataSource } from '../../../../../core/feature/sales-orders/data/datasource/SalesOrderRemoteDataSource';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';

describe('Sales order RMA contracts', () => {
  it('sends authorization to create-rma with original-line references', async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const source = new SalesOrderRemoteDataSource({ post } as unknown as ApiClient);
    const payload = {
      lines: [{ item_id: 10, quantity: 2, original_so_line_id: 100 }],
      memo: 'Producto dañado'
    };

    await source.createRma(12, payload);
    expect(post).toHaveBeenCalledWith('/api/admin/sales-orders/12/create-rma', payload);
  });

  it('sends physical receipt to receive-return using its independent DTO', async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const source = new SalesOrderRemoteDataSource({ post } as unknown as ApiClient);
    const payload = {
      item_id: 10, quantity: 1, warehouse_id: 2, bin_id: 20,
      notes: 'Caja abierta', idempotency_key: 'receive-1'
    };

    await source.receiveReturn(55, payload);
    expect(post).toHaveBeenCalledWith('/api/admin/sales-orders/55/receive-return', payload);
  });
});
