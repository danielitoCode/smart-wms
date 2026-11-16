import { describe, expect, it, vi } from 'vitest';
import {
  CancelBackorderUseCase, GetBackorderDetailUseCase, ListBackordersUseCase
} from '../../../../../../core/feature/backorders/domain/usecase/BackorderUseCases';
import type { BackordersRepository } from '../../../../../../core/feature/backorders/domain/repository/BackordersRepository';
import type { SalesOrder } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

function makeOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  return {
    salesOrderId: 41, salesOrderNumber: 'BO-41', soNumber: 'BO-41', id: 41,
    barcode: null, status: 'WAITING_STOCK', priority: 0, warehouseId: 3,
    customerId: null, customerName: 'Customer', customerEmail: null, customerPhone: null,
    customerAddress: null, shipAddress: null, shipMethod: null, shipByDate: null,
    orderType: 'backorder', orderOrigin: null, parentSalesOrderNumber: 'SO-10',
    parentSoId: 10, parentSoNumber: 'SO-10', carrier: null, trackingNumber: null,
    memo: null, orderTotal: null, customerShippingPaid: null, sourceSystem: null,
    cancellationReason: null, createdAt: null, pickedAt: null, shippedAt: null,
    shippedDateLocal: null, billingAddress: {} as SalesOrder['billingAddress'],
    shippingAddress: {} as SalesOrder['shippingAddress'], lines: [], pickTasks: [],
    backorderOpenedAt: '2026-11-01T00:00:00Z', backorderFulfillableAt: null,
    ...overrides
  } as SalesOrder;
}

function repository(order = makeOrder()) {
  return {
    list: vi.fn().mockResolvedValue([]),
    getDetail: vi.fn().mockResolvedValue({ order, parentSalesOrder: null }),
    cancel: vi.fn().mockResolvedValue(undefined)
  } as unknown as BackordersRepository & {
    list: ReturnType<typeof vi.fn>;
    getDetail: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
}

describe('ListBackordersUseCase', () => {
  it('passes the selected warehouse and supported queue to the repository', async () => {
    const repo = repository();
    await new ListBackordersUseCase(repo).execute(3, 'ready-to-ship');
    expect(repo.list).toHaveBeenCalledWith(3, 'ready-to-ship');
  });

  it('rejects invalid warehouse scopes before accessing data', () => {
    const repo = repository();
    const useCase = new ListBackordersUseCase(repo);
    expect(() => useCase.execute(0, 'waiting')).toThrow(/warehouseId/);
    expect(() => useCase.execute(-2, 'waiting')).toThrow(/warehouseId/);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('allows null warehouse only for an explicitly unscoped caller', async () => {
    const repo = repository();
    await new ListBackordersUseCase(repo).execute(null, 'waiting');
    expect(repo.list).toHaveBeenCalledWith(null, 'waiting');
  });
});

describe('GetBackorderDetailUseCase', () => {
  it('loads detail by the child sales-order id', async () => {
    const repo = repository();
    const result = await new GetBackorderDetailUseCase(repo).execute(41);
    expect(repo.getDetail).toHaveBeenCalledWith(41);
    expect(result.order.salesOrderId).toBe(41);
  });

  it('accepts a POS order included by the backorder lifecycle timestamp', async () => {
    const posBackorder = makeOrder({
      orderType: 'sale', parentSoId: null, backorderOpenedAt: '2026-11-02T00:00:00Z'
    });
    const repo = repository(posBackorder);
    const detail = await new GetBackorderDetailUseCase(repo).execute(41);
    expect(detail.order.orderType).toBe('sale');
    expect(detail.order.backorderOpenedAt).toBe('2026-11-02T00:00:00Z');
  });

  it('rejects invalid identifiers and unrelated sales orders', async () => {
    const repo = repository(makeOrder({ orderType: 'sale', backorderOpenedAt: null }));
    const useCase = new GetBackorderDetailUseCase(repo);
    expect(() => useCase.execute(0)).toThrow(/backorderId/);
    await expect(useCase.execute(41)).rejects.toThrow(/no pertenece/);
  });
});

describe('CancelBackorderUseCase', () => {
  it('cancels only a child backorder with a valid reason', async () => {
    const repo = repository();
    await new CancelBackorderUseCase(repo).execute(41, 'found');
    expect(repo.getDetail).toHaveBeenCalledWith(41);
    expect(repo.cancel).toHaveBeenCalledWith(41, 'found');
  });

  it('allows refund reason and keeps it distinct from ordinary cancellation', async () => {
    const repo = repository();
    await new CancelBackorderUseCase(repo).execute(41, 'refunded');
    expect(repo.cancel).toHaveBeenCalledWith(41, 'refunded');
  });

  it('rejects a POS shortage row that is not order_type=backorder with a parent', async () => {
    const repo = repository(makeOrder({ orderType: 'sale', parentSoId: null }));
    await expect(new CancelBackorderUseCase(repo).execute(41, 'other')).rejects.toThrow(/no es un backorder/);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('rejects already-cancelled, refunded and shipped orders before posting', async () => {
    for (const status of ['CANCELLED', 'REFUNDED', 'SHIPPED'] as const) {
      const repo = repository(makeOrder({ status }));
      await expect(new CancelBackorderUseCase(repo).execute(41, 'other')).rejects.toThrow(status);
      expect(repo.cancel).not.toHaveBeenCalled();
    }
  });

  it('does not issue a second cancellation after the first request changed the status', async () => {
    const repo = repository(makeOrder({ status: 'CANCELLED' }));
    await expect(new CancelBackorderUseCase(repo).execute(41, 'found')).rejects.toThrow(/CANCELLED/);
    expect(repo.cancel).not.toHaveBeenCalled();
  });
});
