import { describe, expect, it, vi } from 'vitest';
import type { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import { GetAllPrintableTicketsUseCase } from '../../../../../../core/feature/picking-tickets/domain/usecase/GetAllPrintableTicketsUseCase';
describe('GetAllPrintableTicketsUseCase', () => {
  it('reuses the existing sales-order list contract for OPEN and PICKED queues', async () => {
    const list = { execute: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 1000, pages: 1 }) } as unknown as ListSalesOrdersUseCase;
    const useCase = new GetAllPrintableTicketsUseCase(list);
    await useCase.execute({ warehouseId: 3, status: 'ALL' });
    expect(list.execute).toHaveBeenCalledWith({
      status: 'OPEN,PICKED', warehouseId: 3, page: 1, perPage: 1000,
      hidePrinted: true, includePrimaryBin: true, includeLineCount: true
    });
  });
  it('supports explicitly including printed orders for reprints', async () => {
    const list = { execute: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 1000, pages: 1 }) } as unknown as ListSalesOrdersUseCase;
    await new GetAllPrintableTicketsUseCase(list).execute({ status: 'PICKED', hidePrinted: false });
    expect(list.execute).toHaveBeenCalledWith(expect.objectContaining({ status: 'PICKED', hidePrinted: false }));
  });
  it('rejects invalid warehouse filters before querying', () => {
    const list = { execute: vi.fn() } as unknown as ListSalesOrdersUseCase;
    expect(() => new GetAllPrintableTicketsUseCase(list).execute({ warehouseId: 0 })).toThrow(/warehouseId/);
    expect(list.execute).not.toHaveBeenCalled();
  });
});
