import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CreateSalesOrderUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';

describe('CreateSalesOrderUseCase', () => {
  it('validates order number, warehouse, lines and unique items', () => {
    const repo = { create: vi.fn() } as unknown as SalesOrderRepository;
    const useCase = new CreateSalesOrderUseCase(repo);

    expect(() => useCase.execute({
      soNumber: ' ', warehouseId: 1, lines: [{ itemId: 1, quantityOrdered: 1 }]
    })).toThrow(/soNumber/);
    expect(() => useCase.execute({
      soNumber: 'SO-1', warehouseId: 0, lines: [{ itemId: 1, quantityOrdered: 1 }]
    })).toThrow(/warehouseId/);
    expect(() => useCase.execute({ soNumber: 'SO-1', warehouseId: 1, lines: [] })).toThrow(/line/);
    expect(() => useCase.execute({
      soNumber: 'SO-1', warehouseId: 1,
      lines: [{ itemId: 1, quantityOrdered: 1 }, { itemId: 1, quantityOrdered: 2 }]
    })).toThrow(/duplicate/);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('trims and forwards every supported optional create field', async () => {
    const create = vi.fn(async (input) => input);
    const repo = { create } as unknown as SalesOrderRepository;
    const useCase = new CreateSalesOrderUseCase(repo);

    await useCase.execute({
      soNumber: ' SO-9 ', warehouseId: 3, customerName: ' Acme ',
      customerEmail: ' sales@example.com ', customerPhone: ' 123 ',
      customerAddress: ' 1 Main ', shipAddress: ' Warehouse ',
      shipMethod: ' Ground ', shipByDate: ' 2026-11-20 ',
      memo: ' Handle carefully ', orderOrigin: ' ERP ',
      lines: [{ itemId: 10, quantityOrdered: 2 }]
    });

    expect(create).toHaveBeenCalledWith({
      soNumber: 'SO-9', warehouseId: 3, customerName: 'Acme',
      customerEmail: 'sales@example.com', customerPhone: '123',
      customerAddress: '1 Main', shipAddress: 'Warehouse',
      shipMethod: 'Ground', shipByDate: '2026-11-20',
      memo: 'Handle carefully', orderOrigin: 'ERP',
      lines: [{ itemId: 10, quantityOrdered: 2 }]
    });
  });
});
