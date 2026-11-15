import { describe, expect, it, vi } from 'vitest';
import {
  AddPurchaseOrderLineUseCase, CreatePurchaseOrderUseCase, ListPurchaseOrdersUseCase,
  UpdatePurchaseOrderLineUseCase
} from '../../../../../../core/feature/purchase-orders/domain/usecase/PurchaseOrderUseCases';
import type { PurchaseOrdersRepository } from '../../../../../../core/feature/purchase-orders/domain/repository/PurchaseOrdersRepository';

describe('Purchase order use cases', () => {
  it('requires at least one line and validates positive quantities', () => {
    const create = vi.fn();
    const repository = { create } as unknown as PurchaseOrdersRepository;
    const useCase = new CreatePurchaseOrderUseCase(repository);
    expect(() => useCase.execute({ poNumber: 'PO-1', warehouseId: 1, lines: [] })).toThrow(/at least one/i);
    expect(() => useCase.execute({
      poNumber: 'PO-1', warehouseId: 1, lines: [{ itemId: 5, quantityOrdered: 0 }]
    })).toThrow(/quantityOrdered/);
    expect(() => useCase.execute({
      poNumber: 'PO-1', warehouseId: 1,
      lines: [{ itemId: 5, quantityOrdered: 2 }, { itemId: 5, quantityOrdered: 3 }]
    })).toThrow(/duplicate/);
    expect(create).not.toHaveBeenCalled();
  });

  it('trims the order number and forwards valid multi-line input', async () => {
    const create = vi.fn(async input => input);
    const useCase = new CreatePurchaseOrderUseCase({ create } as unknown as PurchaseOrdersRepository);
    await useCase.execute({
      poNumber: ' PO-10 ', warehouseId: 2,
      lines: [{ itemId: 10, quantityOrdered: 3 }, { itemId: 11, quantityOrdered: 7, unitCost: 1.25 }]
    });
    expect(create).toHaveBeenCalledWith({
      poNumber: 'PO-10', warehouseId: 2,
      lines: [{ itemId: 10, quantityOrdered: 3 }, { itemId: 11, quantityOrdered: 7, unitCost: 1.25 }]
    });
  });

  it('passes pagination, status, search and expected-date filters to the repository', async () => {
    const list = vi.fn().mockResolvedValue({ items: [], total: 0, page: 2, perPage: 25, pages: 0 });
    const useCase = new ListPurchaseOrdersUseCase({ list } as unknown as PurchaseOrdersRepository);
    await useCase.execute({
      page: 2, perPage: 25, status: 'PARTIAL', search: ' PO-10 ',
      dateFrom: '2026-01-01', dateTo: '2026-01-31', warehouseId: 2
    });
    expect(list).toHaveBeenCalledWith({
      page: 2, perPage: 25, status: 'PARTIAL', search: 'PO-10',
      dateFrom: '2026-01-01', dateTo: '2026-01-31', warehouseId: 2
    });
    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    expect(() => useCase.execute({ dateFrom: '2026-02-01', dateTo: '2026-01-01' })).toThrow(/dateFrom/);
  });

  it('rejects an edited ordered quantity below one before calling the repository', () => {
    const updateLine = vi.fn();
    const useCase = new UpdatePurchaseOrderLineUseCase({ updateLine } as unknown as PurchaseOrdersRepository);
    expect(() => useCase.execute(1, 2, { quantityOrdered: 0 })).toThrow(/quantityOrdered/);
    expect(updateLine).not.toHaveBeenCalled();
  });

  it('validates identifiers and quantities before adding a line', () => {
    const addLine = vi.fn();
    const useCase = new AddPurchaseOrderLineUseCase({ addLine } as unknown as PurchaseOrdersRepository);
    expect(() => useCase.execute(0, { itemId: 4, quantityOrdered: 1 })).toThrow(/purchaseOrderId/);
    expect(() => useCase.execute(1, { itemId: 4, quantityOrdered: -1 })).toThrow(/quantityOrdered/);
    expect(addLine).not.toHaveBeenCalled();
  });
});
