import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  listSalesOrders: { execute: vi.fn() },
  getSalesOrder: { execute: vi.fn() },
  createSalesOrder: { execute: vi.fn() },
  updateSalesOrder: { execute: vi.fn() }
}));

vi.mock('../../../../../../core/feature/sales-orders/di/sales-orders.dependencies', () => ({
  createSalesOrdersDependencies: () => deps
}));

import { createSalesOrdersState } from '../../../../../../core/feature/sales-orders/ui/state/salesOrdersState.svelte';
import type { SalesOrder, SalesOrderPage } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

function order(id: number, quantityAllocated = 0): SalesOrder {
  return {
    salesOrderId: id,
    salesOrderNumber: `SO-${id}`,
    soNumber: `SO-${id}`,
    id,
    barcode: null,
    status: 'OPEN',
    priority: 0,
    warehouseId: 1,
    customerId: null,
    customerName: null,
    customerEmail: null,
    customerPhone: null,
    customerAddress: null,
    shipAddress: null,
    shipMethod: null,
    shipByDate: null,
    orderType: 'sale',
    orderOrigin: null,
    parentSalesOrderNumber: null,
    parentSoId: null,
    parentSoNumber: null,
    carrier: null,
    trackingNumber: null,
    memo: null,
    orderTotal: null,
    customerShippingPaid: null,
    sourceSystem: null,
    cancellationReason: null,
    createdAt: null,
    pickedAt: null,
    shippedAt: null,
    shippedDateLocal: null,
    billingAddress: { name: null, line1: null, line2: null, city: null, state: null, postalCode: null, country: null, phone: null },
    shippingAddress: { name: null, line1: null, line2: null, city: null, state: null, postalCode: null, country: null, phone: null },
    lines: [{
      soLineId: id * 10,
      lineId: id * 10,
      lineNumber: 1,
      itemId: 5,
      sku: 'SKU-5',
      itemName: 'Item 5',
      upc: null,
      quantityOrdered: 8,
      quantityAllocated,
      quantityPicked: 0,
      quantityPacked: 0,
      quantityShipped: 0,
      quantityReceived: 0,
      status: null
    }],
    pickTasks: []
  };
}

const page = (items: SalesOrder[] = []): SalesOrderPage => ({
  items, total: items.length, page: 1, perPage: 50, pages: 1
});

describe('salesOrdersState request ordering and create confirmation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.listSalesOrders.execute.mockResolvedValue(page());
    deps.getSalesOrder.execute.mockImplementation(async (id: number) => order(id));
    deps.createSalesOrder.execute.mockImplementation(async () => order(99, 5));
    deps.updateSalesOrder.execute.mockResolvedValue(undefined);
  });

  it('keeps only the newest list response when filters change during a request', async () => {
    const first = deferred<SalesOrderPage>();
    const second = deferred<SalesOrderPage>();
    deps.listSalesOrders.execute
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const state = createSalesOrdersState();
    const firstLoad = state.load();
    state.setSearch('new filter');
    const secondLoad = state.load();

    second.resolve(page([order(2)]));
    expect(await secondLoad).toBe(true);
    first.resolve(page([order(1)]));
    expect(await firstLoad).toBe(false);

    expect(state.orders.map((entry) => entry.salesOrderId)).toEqual([2]);
    expect(state.loading).toBe(false);
    expect(deps.listSalesOrders.execute).toHaveBeenNthCalledWith(2, expect.objectContaining({
      q: 'new filter', page: 1, perPage: 50
    }));
  });

  it('does not let an older list request clear loading while the latest request is pending', async () => {
    const first = deferred<SalesOrderPage>();
    const second = deferred<SalesOrderPage>();
    deps.listSalesOrders.execute
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const state = createSalesOrdersState();
    const firstLoad = state.load();
    const secondLoad = state.load();

    first.resolve(page([order(1)]));
    expect(await firstLoad).toBe(false);
    expect(state.loading).toBe(true);

    second.resolve(page([order(2)]));
    expect(await secondLoad).toBe(true);
    expect(state.loading).toBe(false);
    expect(state.orders.map((entry) => entry.salesOrderId)).toEqual([2]);
  });

  it('keeps the newest selected order when details are opened rapidly', async () => {
    const first = deferred<SalesOrder>();
    const second = deferred<SalesOrder>();
    deps.getSalesOrder.execute
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const state = createSalesOrdersState();
    const firstOpen = state.open(1);
    const secondOpen = state.open(2);

    second.resolve(order(2));
    expect(await secondOpen).toBe(true);
    first.resolve(order(1));
    expect(await firstOpen).toBe(false);
    expect(state.selected?.salesOrderId).toBe(2);
  });

  it('ignores a stale detail failure after a newer order has opened', async () => {
    const first = deferred<SalesOrder>();
    const second = deferred<SalesOrder>();
    deps.getSalesOrder.execute
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const state = createSalesOrdersState();
    const firstOpen = state.open(1);
    const secondOpen = state.open(2);

    second.resolve(order(2));
    expect(await secondOpen).toBe(true);
    first.reject(new Error('stale request failed'));
    expect(await firstOpen).toBe(false);
    expect(state.selected?.salesOrderId).toBe(2);
    expect(state.error).toBeNull();
  });

  it('invalidates a pending detail request when the detail is closed', async () => {
    const pending = deferred<SalesOrder>();
    deps.getSalesOrder.execute.mockReturnValueOnce(pending.promise);

    const state = createSalesOrdersState();
    const opening = state.open(1);
    state.close();
    pending.resolve(order(1));

    expect(await opening).toBe(false);
    expect(state.selected).toBeNull();
  });

  it('reports a confirmed mutation as successful when the follow-up detail refresh fails', async () => {
    deps.getSalesOrder.execute
      .mockResolvedValueOnce(order(1))
      .mockRejectedValueOnce(new Error('detail refresh unavailable'));
    const state = createSalesOrdersState();
    expect(await state.open(1)).toBe(true);

    const result = await state.update(1, {} as never);

    expect(result).toBe(true);
    expect(state.error).toBeNull();
    expect(state.refreshError).toMatch(/operación se confirmó/);
    expect(deps.updateSalesOrder.execute).toHaveBeenCalledTimes(1);
  });

  it('retains the created detail and the server allocation quantities', async () => {
    const created = order(99, 5);
    deps.createSalesOrder.execute.mockResolvedValueOnce(created);
    deps.listSalesOrders.execute
      .mockResolvedValueOnce({ ...page(), pages: 4 })
      .mockResolvedValueOnce(page());
    const state = createSalesOrdersState();
    await state.load();
    state.setPage(3);

    const result = await state.create({
      salesOrderNumber: 'SO-99',
      warehouseId: 1,
      lines: [{ itemId: 5, quantityOrdered: 8 }]
    });

    expect(result).toBe(true);
    expect(state.page).toBe(1);
    expect(state.selected).toBe(created);
    expect(state.selected?.lines[0].quantityAllocated).toBe(5);
    expect(deps.listSalesOrders.execute).toHaveBeenCalledTimes(2);
  });
});
