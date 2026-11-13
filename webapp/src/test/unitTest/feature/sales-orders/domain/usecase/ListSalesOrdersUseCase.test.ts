import { describe, expect, it, vi } from 'vitest';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrderPage } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

const emptyPage: SalesOrderPage = {
  items: [],
  total: 0,
  page: 1,
  perPage: 50,
  pages: 1
};

describe('ListSalesOrdersUseCase', () => {
  it('forwards normalized filters and keeps pagination metadata', async () => {
    const listPage = vi.fn(async () => emptyPage);
    const repository = { listPage } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrdersUseCase(repository);

    await useCase.execute({
      status: ' OPEN ',
      warehouseId: 2,
      page: 1,
      perPage: 50,
      q: '  SO ',
      excludePostFulfillment: true
    });

    expect(listPage).toHaveBeenCalledWith({
      status: 'OPEN',
      warehouseId: 2,
      page: 1,
      perPage: 50,
      q: 'SO',
      excludePostFulfillment: true
    });
  });

  it('rejects invalid pagination and warehouse before accessing repository', () => {
    const listPage = vi.fn();
    const useCase = new ListSalesOrdersUseCase({
      listPage
    } as unknown as SalesOrderRepository);

    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    expect(() => useCase.execute({ perPage: 1001 })).toThrow(/perPage/);
    expect(() => useCase.execute({ warehouseId: -1 })).toThrow(/warehouseId/);
    expect(listPage).not.toHaveBeenCalled();
  });
});
