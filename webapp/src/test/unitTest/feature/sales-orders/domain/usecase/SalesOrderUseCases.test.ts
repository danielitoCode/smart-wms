import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CreateSalesOrderUseCase';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';

describe('Sales order use cases', () => {
  it('validates pagination before listing', () => {
    const repository = { list: vi.fn() } as unknown as SalesOrderRepository;
    expect(() => new ListSalesOrdersUseCase(repository).execute({ page: 0 })).toThrow(/página/);
    expect(repository.list).not.toHaveBeenCalled();
  });

  it('trims the search term and applies safe pagination defaults', async () => {
    const repository = { list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 50, pages: 1 }) } as unknown as SalesOrderRepository;
    await new ListSalesOrdersUseCase(repository).execute({ search: ' SO-1 ' });
    expect(repository.list).toHaveBeenCalledWith({
      search: 'SO-1', page: 1, perPage: 50
    });
  });

  it('requires a number, warehouse and unique positive item lines', () => {
    const repository = { create: vi.fn() } as unknown as SalesOrderRepository;
    const useCase = new CreateSalesOrderUseCase(repository);
    expect(() => useCase.execute({
      salesOrderNumber: ' ', warehouseId: 1, lines: [{ itemId: 1, quantityOrdered: 1 }]
    })).toThrow(/número/);
    expect(() => useCase.execute({
      salesOrderNumber: 'SO-1', warehouseId: 1,
      lines: [{ itemId: 1, quantityOrdered: 1 }, { itemId: 1, quantityOrdered: 2 }]
    })).toThrow(/repetir/);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
