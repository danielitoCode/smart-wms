import { describe, expect, it, vi } from 'vitest';
import {
  CancelBackorderUseCase, GetBackorderAuditHistoryUseCase, GetBackorderDetailUseCase, ListBackordersUseCase
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

function makeParent(id = 10): SalesOrder {
  return makeOrder({
    salesOrderId: id, salesOrderNumber: 'SO-10', soNumber: 'SO-10', id,
    parentSoId: null, parentSoNumber: null, parentSalesOrderNumber: null,
    orderType: 'sale'
  });
}

function repository(order = makeOrder(), parentSalesOrder: SalesOrder | null = order.parentSoId === null ? null : makeParent(order.parentSoId)) {
  return {
    list: vi.fn().mockResolvedValue([]),
    getDetail: vi.fn().mockResolvedValue({
      order, parentSalesOrder, lines: [], totalQuantityPending: 0, totalQuantityResolved: 0
    }),
    cancel: vi.fn().mockResolvedValue(undefined),
    auditHistory: vi.fn().mockResolvedValue({ entries: [], page: 1, perPage: 20, total: 0, pages: 1 })
  } as unknown as BackordersRepository & {
    list: ReturnType<typeof vi.fn>;
    getDetail: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    auditHistory: ReturnType<typeof vi.fn>;
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

  it('allows null warehouse only when the caller has already resolved an admin-wide scope', async () => {
    const repo = repository();
    await new ListBackordersUseCase(repo).execute(null, 'waiting');
    expect(repo.list).toHaveBeenCalledWith(null, 'waiting');
  });
});

describe('GetBackorderDetailUseCase', () => {
  it('loads the backorder and validates the parent relationship resolved from detail', async () => {
    const repo = repository();
    const result = await new GetBackorderDetailUseCase(repo).execute(41);
    expect(repo.getDetail).toHaveBeenCalledWith(41);
    expect(result.order.salesOrderId).toBe(41);
    expect(result.parentSalesOrder?.salesOrderId).toBe(10);
  });

  it('accepts a POS order included by the backorder lifecycle timestamp without a parent', async () => {
    const posBackorder = makeOrder({
      orderType: 'sale', parentSoId: null, backorderOpenedAt: '2026-11-02T00:00:00Z'
    });
    const repo = repository(posBackorder);
    const detail = await new GetBackorderDetailUseCase(repo).execute(41);
    expect(detail.order.orderType).toBe('sale');
    expect(detail.parentSalesOrder).toBeNull();
  });

  it('rejects a mismatched parent detail', async () => {
    const repo = repository(makeOrder(), makeParent(99));
    await expect(new GetBackorderDetailUseCase(repo).execute(41)).rejects.toThrow(/pedido original/);
  });

  it('keeps a cancelled parent visible in detail so the UI can explain the cascade state', async () => {
    const cancelledParent = makeParent();
    cancelledParent.status = 'CANCELLED';
    const repo = repository(makeOrder(), cancelledParent);
    const detail = await new GetBackorderDetailUseCase(repo).execute(41);
    expect(detail.parentSalesOrder?.status).toBe('CANCELLED');
  });

  it('rejects invalid identifiers and unrelated sales orders', async () => {
    const repo = repository(makeOrder({ orderType: 'sale', backorderOpenedAt: null }));
    const useCase = new GetBackorderDetailUseCase(repo);
    expect(() => useCase.execute(0)).toThrow(/backorderId/);
    await expect(useCase.execute(41)).rejects.toThrow(/no pertenece/);
  });
});

describe('CancelBackorderUseCase', () => {
  it('validates and retrieves paginated audit history', async () => {
    const repo = repository();
    const useCase = new GetBackorderAuditHistoryUseCase(repo);
    await useCase.execute(41, 2);
    expect(repo.auditHistory).toHaveBeenCalledWith(41, 2);
    expect(() => useCase.execute(0, 1)).toThrow(/Pedido no válido/);
    expect(() => useCase.execute(41, 0)).toThrow(/Página de historial/);
  });

  it('cancels only a child backorder with a resolved parent and valid reason', async () => {
    const repo = repository();
    await new CancelBackorderUseCase(repo).execute(41, 'found', 3);
    expect(repo.getDetail).toHaveBeenCalledWith(41);
    expect(repo.cancel).toHaveBeenCalledWith(41, 'found');
  });

  it('allows refund reason and keeps it distinct from ordinary cancellation', async () => {
    const repo = repository();
    await new CancelBackorderUseCase(repo).execute(41, 'refunded', 3);
    expect(repo.cancel).toHaveBeenCalledWith(41, 'refunded');
  });

  it('rejects cancellation when the fetched order belongs to another warehouse', async () => {
    const repo = repository(makeOrder({ warehouseId: 4 }));
    await expect(new CancelBackorderUseCase(repo).execute(41, 'other', 3)).rejects.toThrow(/no pertenece al almacén/);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('rejects cancellation without a valid selected warehouse', async () => {
    const repo = repository();
    await expect(new CancelBackorderUseCase(repo).execute(41, 'other', 0)).rejects.toThrow(/almacén autorizado/);
    expect(repo.getDetail).not.toHaveBeenCalled();
  });

  it('rejects a POS shortage row that is not order_type=backorder with a parent', async () => {
    const repo = repository(makeOrder({ orderType: 'sale', parentSoId: null }));
    await expect(new CancelBackorderUseCase(repo).execute(41, 'other', 3)).rejects.toThrow(/no es un backorder/);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('rejects a missing or mismatched parent before posting cancellation', async () => {
    const repo = repository(makeOrder(), null);
    await expect(new CancelBackorderUseCase(repo).execute(41, 'other', 3)).rejects.toThrow(/pedido original/);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('does not cancel an active child when its original sales order is already cancelled', async () => {
    const cancelledParent = makeParent();
    cancelledParent.status = 'CANCELLED';
    const repo = repository(makeOrder({ status: 'WAITING_STOCK' }), cancelledParent);
    await expect(new CancelBackorderUseCase(repo).execute(41, 'other')).rejects.toThrow(/pedido original ya está cancelado/);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('rejects every state outside the backend cancellation lifecycle', async () => {
    for (const status of ['CANCELLED', 'REFUNDED', 'SHIPPED', 'FRAUD_REVIEW'] as const) {
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
