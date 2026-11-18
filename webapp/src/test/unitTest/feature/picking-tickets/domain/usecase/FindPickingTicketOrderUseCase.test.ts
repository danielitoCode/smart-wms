import { describe, expect, it, vi } from 'vitest';
import type { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import { FindPickingTicketOrderUseCase } from '../../../../../../core/feature/picking-tickets/domain/usecase/FindPickingTicketOrderUseCase';
describe('FindPickingTicketOrderUseCase', () => {
  it('rejects blank searches without hitting the sales-order list', () => {
    const list = { execute: vi.fn() } as unknown as ListSalesOrdersUseCase;
    expect(() => new FindPickingTicketOrderUseCase(list).execute('  ')).toThrow(/número de pedido/);
    expect(list.execute).not.toHaveBeenCalled();
  });
  it('reuses the canonical sales-order search endpoint with a bounded result page', async () => {
    const list = { execute: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10, pages: 1 }) } as unknown as ListSalesOrdersUseCase;
    await new FindPickingTicketOrderUseCase(list).execute('  SO-104  ');
    expect(list.execute).toHaveBeenCalledWith({ q: 'SO-104', page: 1, perPage: 10 });
  });
});
