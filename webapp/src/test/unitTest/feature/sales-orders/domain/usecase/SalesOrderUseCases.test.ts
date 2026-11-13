import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CreateSalesOrderUseCase';
import { GetAvailableSalesOrderBinsUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/FulfillSalesOrderUseCases';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrderPage } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

describe('Sales order use cases', () => {
  it('validates pagination and search before listing', async () => {
    const page: SalesOrderPage = {
      items: [],
      total: 0,
      page: 1,
      perPage: 50,
      pages: 1
    };
    const listPage = vi.fn().mockResolvedValue(page);
    const repository = { listPage } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrdersUseCase(repository);

    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    await useCase.execute({ q: ' SO-1 ' });
    expect(listPage).toHaveBeenCalledWith({
      q: 'SO-1',
      status: undefined,
      warehouseId: undefined,
      page: undefined,
      perPage: undefined,
      excludePostFulfillment: false
    });
  });

  it('validates identifiers before looking up available picking bins', async () => {
    const getAvailableBins = vi.fn().mockResolvedValue([]);
    const useCase = new GetAvailableSalesOrderBinsUseCase({
      getAvailableBins
    } as unknown as SalesOrderRepository);

    expect(() => useCase.execute(0, 10)).toThrow(/identificador del pedido/);
    expect(() => useCase.execute(10, 0)).toThrow(/identificador de la línea/);
    await useCase.execute(10, 20);
    expect(getAvailableBins).toHaveBeenCalledWith(10, 20);
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
