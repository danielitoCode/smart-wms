import { describe, expect, it, vi } from 'vitest';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrder } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

function emptyOrder(partial: Partial<SalesOrder> = {}): SalesOrder {
  return {
    salesOrderId: 1, salesOrderNumber: 'SO-1',
    id: 1, soNumber: 'SO-1', barcode: null, status: 'OPEN', priority: 0,
    warehouseId: 1, customerId: null, customerName: 'Acme',
    customerEmail: null, customerPhone: null, customerAddress: null,
    shipAddress: null, shipMethod: null, shipByDate: null,
    orderType: null, orderOrigin: null, parentSalesOrderNumber: null,
    parentSoId: null, parentSoNumber: null, carrier: null, trackingNumber: null,
    memo: null, orderTotal: null, customerShippingPaid: null, sourceSystem: null,
    cancellationReason: null, createdAt: null, pickedAt: null, shippedAt: null,
    shippedDateLocal: null,
    billingAddress: { name: null, line1: null, line2: null, city: null, state: null, postalCode: null, country: null, phone: null },
    shippingAddress: { name: null, line1: null, line2: null, city: null, state: null, postalCode: null, country: null, phone: null },
    lines: [], pickTasks: [], ...partial
  };
}

describe('ListSalesOrdersUseCase', () => {
  it('forwards normalized filters to repository', async () => {
    const list = vi.fn(async () => [emptyOrder()]);
    const repo = { list } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrdersUseCase(repo);

    await useCase.execute({ status: ' OPEN ', warehouseId: 2, page: 1, perPage: 50, q: '  SO ' });

    expect(list).toHaveBeenCalledWith({
      status: 'OPEN', warehouseId: 2, page: 1, perPage: 50, q: 'SO'
    });
  });

  it('rejects invalid page and warehouse before accessing repository', () => {
    const list = vi.fn();
    const useCase = new ListSalesOrdersUseCase({ list } as unknown as SalesOrderRepository);
    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    expect(() => useCase.execute({ warehouseId: -1 })).toThrow(/warehouseId/);
    expect(list).not.toHaveBeenCalled();
  });
});
