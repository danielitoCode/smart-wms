import { describe, expect, it, vi } from 'vitest';
import { BackordersRepositoryImpl } from '../../../../../core/feature/backorders/data/repository/BackordersRepositoryImpl';
import type { BackordersRemoteDataSource } from '../../../../../core/feature/backorders/data/datasource/BackordersRemoteDataSource';
import type { SalesOrderRepository } from '../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrder } from '../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

const order = {
  salesOrderId: 41, parentSoId: 10, parentSoNumber: 'SO-10', orderType: 'backorder'
} as SalesOrder;
const parentOrder = {
  salesOrderId: 10, salesOrderNumber: 'SO-10', soNumber: 'SO-10', status: 'OPEN'
} as SalesOrder;

describe('BackordersRepositoryImpl', () => {
  it('resolves the original order using the parent sales-order id', async () => {
    const remote = { list: vi.fn().mockResolvedValue([]), cancel: vi.fn() } as unknown as BackordersRemoteDataSource;
    const salesOrders = {
      getById: vi.fn().mockResolvedValueOnce(order).mockResolvedValueOnce(parentOrder)
    } as unknown as SalesOrderRepository;
    const repository = new BackordersRepositoryImpl(remote, salesOrders);
    const detail = await repository.getDetail(41);
    expect(salesOrders.getById).toHaveBeenCalledWith(41);
    expect(salesOrders.getById).toHaveBeenNthCalledWith(2, 10);
    expect(detail.parentSalesOrder?.salesOrderId).toBe(10);
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
