import { describe, expect, it, vi } from 'vitest';
import { BackordersRepositoryImpl } from '../../../../../core/feature/backorders/data/repository/BackordersRepositoryImpl';
import type { BackordersRemoteDataSource } from '../../../../../core/feature/backorders/data/datasource/BackordersRemoteDataSource';
import type { SalesOrderRepository } from '../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrder } from '../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

const parentOrder = {
  salesOrderId: 10, salesOrderNumber: 'SO-10', parentSoId: null, orderType: 'sale'
} as SalesOrder;
const backorder = {
  salesOrderId: 41, parentSoId: 10, parentSoNumber: 'SO-10', orderType: 'backorder',
  lines: [
    { soLineId: 1, quantityOrdered: 5, quantityAllocated: 3, quantityPicked: 2, quantityPacked: 1, quantityShipped: 1 },
    { soLineId: 2, quantityOrdered: 4, quantityAllocated: 4, quantityPicked: 4, quantityPacked: 4, quantityShipped: 0 }
  ]
} as SalesOrder;

describe('BackordersRepositoryImpl', () => {
  it('resolves the parent using the id supplied by sales-order detail and projects pending/resolved quantities', async () => {
    const remote = { list: vi.fn().mockResolvedValue([]), cancel: vi.fn() } as unknown as BackordersRemoteDataSource;
    const salesOrders = {
      getById: vi.fn()
        .mockResolvedValueOnce(backorder)
        .mockResolvedValueOnce(parentOrder)
    } as unknown as SalesOrderRepository;
    const repository = new BackordersRepositoryImpl(remote, salesOrders);
    const detail = await repository.getDetail(41);

    expect(salesOrders.getById).toHaveBeenNthCalledWith(1, 41);
    expect(salesOrders.getById).toHaveBeenNthCalledWith(2, 10);
    expect(detail.parentSalesOrder).toBe(parentOrder);
    expect(detail.lines.map((line) => [line.quantityPending, line.quantityResolved])).toEqual([[4, 1], [4, 0]]);
    expect(detail.totalQuantityPending).toBe(8);
    expect(detail.totalQuantityResolved).toBe(1);
  });

  it('maps paginated sales-order audit history without changing event details', async () => {
    const remote = {
      auditHistory: vi.fn().mockResolvedValue({
        entries: [{
          log_id: 7, action_type: 'CANCEL', username: 'operator', warehouse_id: 3,
          details: { pre_status: 'WAITING_STOCK' }, created_at: '2026-11-19T10:00:00Z'
        }],
        total: 1, page: 1, per_page: 20, pages: 1
      })
    } as unknown as BackordersRemoteDataSource;
    const repository = new BackordersRepositoryImpl(remote, {} as SalesOrderRepository);
    const history = await repository.auditHistory(41, 1);
    expect(remote.auditHistory).toHaveBeenCalledWith(41, 1);
    expect(history).toEqual({
      entries: [{
        logId: 7, actionType: 'CANCEL', username: 'operator', warehouseId: 3,
        details: { pre_status: 'WAITING_STOCK' }, createdAt: '2026-11-19T10:00:00Z'
      }],
      page: 1, perPage: 20, total: 1, pages: 1
    });
  });

  it('does not request a parent when sales-order detail has no parent id', async () => {
    const posOrder = { ...backorder, parentSoId: null, orderType: 'sale' } as SalesOrder;
    const salesOrders = { getById: vi.fn().mockResolvedValue(posOrder) } as unknown as SalesOrderRepository;
    const repository = new BackordersRepositoryImpl({} as BackordersRemoteDataSource, salesOrders);
    const detail = await repository.getDetail(41);
    expect(salesOrders.getById).toHaveBeenCalledTimes(1);
    expect(detail.parentSalesOrder).toBeNull();
  });

  it('keeps list and cancel delegated to their own data contracts', async () => {
    const remote = {
      list: vi.fn().mockResolvedValue([]),
      cancel: vi.fn().mockResolvedValue(undefined)
    } as unknown as BackordersRemoteDataSource;
    const salesOrders = {} as SalesOrderRepository;
    const repository = new BackordersRepositoryImpl(remote, salesOrders);
    await repository.list(3, 'waiting');
    await repository.cancel(41, 'other');
    expect(remote.list).toHaveBeenCalledWith(3, 'waiting');
    expect(remote.cancel).toHaveBeenCalledWith(41, 'other');
  });
});
