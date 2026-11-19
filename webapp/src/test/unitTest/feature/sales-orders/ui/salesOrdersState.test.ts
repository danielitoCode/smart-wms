import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  listSalesOrders: { execute: vi.fn() },
  getSalesOrder: { execute: vi.fn() },
  createSalesOrder: { execute: vi.fn() },
  updateSalesOrder: { execute: vi.fn() },
  updateSalesOrderAddress: { execute: vi.fn() },
  updateSalesOrderAllocation: { execute: vi.fn() },
  cancelSalesOrder: { execute: vi.fn() },
  addSalesOrderLine: { execute: vi.fn() },
  updateSalesOrderLine: { execute: vi.fn() },
  deleteSalesOrderLine: { execute: vi.fn() },
  adminPickSalesOrder: { execute: vi.fn() },
  getAvailableSalesOrderBins: { execute: vi.fn() },
  adminShipSalesOrder: { execute: vi.fn() },
  partialFulfillSalesOrder: { execute: vi.fn() },
  revertSalesOrderStatus: { execute: vi.fn() },
  getRelatedSalesOrders: { execute: vi.fn() },
  listSalesOrderSourceSystems: { execute: vi.fn() },
  listSalesOrderShortPicks: { execute: vi.fn() },
  createSalesOrderRma: { execute: vi.fn() },
  receiveSalesOrderReturn: { execute: vi.fn() },
  voidSalesOrderReturn: { execute: vi.fn() }
}));
vi.mock('../../../../../core/feature/sales-orders/di/sales-orders.dependencies', () => ({
  createSalesOrdersDependencies: () => deps
}));

import { createSalesOrdersState } from '../../../../../core/feature/sales-orders/ui/state/salesOrdersState.svelte';

const page = { items: [], total: 0, page: 1, perPage: 50, pages: 1 };
const order = {
  salesOrderId: 17, salesOrderNumber: 'SO-17', status: 'OPEN', warehouseId: 3,
  lines: [], pickTasks: []
};

describe('sales orders UI state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.listSalesOrders.execute.mockResolvedValue(page);
    deps.getSalesOrder.execute.mockResolvedValue(order);
    deps.updateSalesOrder.execute.mockResolvedValue(undefined);
    deps.getAvailableSalesOrderBins.execute.mockResolvedValue([]);
  });

  it('sends the selected warehouse and excludes post-fulfillment records from the main queue', async () => {
    const state = createSalesOrdersState();
    state.setWarehouseId(3);
    state.setSearch(' SO-17 ');
    expect(await state.load()).toBe(true);
    expect(deps.listSalesOrders.execute).toHaveBeenCalledWith({
      status: undefined, warehouseId: 3, q: ' SO-17 ', page: 1, perPage: 50,
      excludePostFulfillment: true
    });
    expect(state.loading).toBe(false);
    expect(state.loadedOnce).toBe(true);
  });

  it('keeps the selected detail when an update fails and refreshes it only after success', async () => {
    const state = createSalesOrdersState();
    expect(await state.open(17)).toBe(true);
    deps.updateSalesOrder.execute.mockRejectedValueOnce(new Error('conflict'));
    expect(await state.update(17, { priority: 2 })).toBe(false);
    expect(state.selected?.salesOrderId).toBe(17);
    expect(state.error).toContain('conflict');
    expect(deps.getSalesOrder.execute).toHaveBeenCalledTimes(1);

    deps.updateSalesOrder.execute.mockResolvedValueOnce(undefined);
    expect(await state.update(17, { priority: 3 })).toBe(true);
    expect(deps.getSalesOrder.execute).toHaveBeenCalledTimes(2);
    expect(state.selected?.salesOrderId).toBe(17);
  });

  it('rejects repeated mutations while a request is pending', async () => {
    const state = createSalesOrdersState();
    await state.open(17);
    let release!: () => void;
    deps.updateSalesOrder.execute.mockImplementationOnce(() => new Promise(resolve => {
      release = () => resolve(undefined);
    }));
    const first = state.update(17, { priority: 4 });
    expect(state.saving).toBe(true);
    expect(await state.update(17, { priority: 5 })).toBe(false);
    expect(deps.updateSalesOrder.execute).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toBe(true);
    expect(state.saving).toBe(false);
  });

  it('does not let an old available-bin response overwrite a newer selected order', async () => {
    const state = createSalesOrdersState();
    await state.open(17);
    let resolveBins!: (value: never[]) => void;
    deps.getAvailableSalesOrderBins.execute.mockImplementationOnce(() => new Promise(resolve => {
      resolveBins = resolve;
    }));
    const pending = state.loadAvailableBins(29);
    await state.open(18);
    resolveBins([{ binId: 1 } as never]);
    expect(await pending).toBe(false);
    expect(state.availableBinsByLine[29]).toBeUndefined();
  });
});
