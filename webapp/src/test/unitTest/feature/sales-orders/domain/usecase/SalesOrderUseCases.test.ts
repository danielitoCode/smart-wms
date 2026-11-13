import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CreateSalesOrderUseCase';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';

describe('Sales order use cases', () => {
  it('validates pagination and search before listing', async () => {
    const list = vi.fn().mockResolvedValue([]);
    const repository = { list } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrdersUseCase(repository);

    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    await useCase.execute({ q: ' SO-1 ' });
    expect(list).toHaveBeenCalledWith({ q: 'SO-1', status: undefined, warehouseId: undefined, page: undefined, perPage: undefined });
  });

  it('requires a number, warehouse and unique positive item lines', () => {
    const create = vi.fn();
    const useCase = new CreateSalesOrderUseCase({ create } as unknown as SalesOrderRepository);
    expect(() => useCase.execute({
      soNumber: ' ', warehouseId: 1, lines: [{ itemId: 1, quantityOrdered: 1 }]
    })).toThrow(/soNumber/);
    expect(() => useCase.execute({
      soNumber: 'SO-1', warehouseId: 1,
      lines: [{ itemId: 1, quantityOrdered: 1 }, { itemId: 1, quantityOrdered: 2 }]
    })).toThrow(/duplicate/);
    expect(create).not.toHaveBeenCalled();
  });
});
