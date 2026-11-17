import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SalesOrder, SalesOrderPage } from '../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

const deps = vi.hoisted(() => ({
  listSalesOrders: { execute: vi.fn() },
  listSalesOrderSourceSystems: { execute: vi.fn() },
  listSalesOrderShortPicks: { execute: vi.fn() },
  getSalesOrder: { execute: vi.fn() },
  getRelatedSalesOrders: { execute: vi.fn() },
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
  createSalesOrderRma: { execute: vi.fn() },
  receiveSalesOrderReturn: { execute: vi.fn() },
  voidSalesOrderReturn: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/sales-orders/di/sales-orders.dependencies', () => ({
  createSalesOrdersDependencies: () => deps
}));

import { createSalesOrdersState } from '../../../../../core/feature/sales-orders/ui/state/salesOrdersState.svelte';

const order = {
  salesOrderId: 41,
  salesOrderNumber: 'SO-41',
  warehouseId: 2,
  status: 'OPEN',
  lines: [],
  pickTasks: []
} as unknown as SalesOrder;

const page: SalesOrderPage = {
  items: [order],
  total: 101,
  page: 1,
  perPage: 50,
  pages: 3
};

describe('Sales Orders UI state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.listSalesOrders.execute.mockResolvedValue(page);
    deps.getSalesOrder.execute.mockResolvedValue(order);
    deps.getRelatedSalesOrders.execute.mockResolvedValue([]);
    deps.listSalesOrderSourceSystems.execute.mockResolvedValue([]);
    deps.listSalesOrderShortPicks.execute.mockResolvedValue([]);
    deps.createSalesOrder.execute.mockResolvedValue(order);
    deps.updateSalesOrder.execute.mockResolvedValue(undefined);
    deps.updateSalesOrderAddress.execute.mockResolvedValue(undefined);
    deps.updateSalesOrderAllocation.execute.mockResolvedValue({
      soLineId: 9, quantityAllocated: 2, unchanged: false
    });
    deps.cancelSalesOrder.execute.mockResolvedValue(order);
    deps.addSalesOrderLine.execute.mockResolvedValue(undefined);
    deps.updateSalesOrderLine.execute.mockResolvedValue(undefined);
    deps.deleteSalesOrderLine.execute.mockResolvedValue(undefined);
    deps.adminPickSalesOrder.execute.mockResolvedValue(undefined);
    deps.getAvailableSalesOrderBins.execute.mockResolvedValue([]);
    deps.adminShipSalesOrder.execute.mockResolvedValue({
      fulfillmentId: 5, linesShipped: 1, totalQuantity: 2
    });
    deps.partialFulfillSalesOrder.execute.mockResolvedValue(undefined);
    deps.revertSalesOrderStatus.execute.mockResolvedValue(undefined);
    deps.createSalesOrderRma.execute.mockResolvedValue(undefined);
    deps.receiveSalesOrderReturn.execute.mockResolvedValue(undefined);
    deps.voidSalesOrderReturn.execute.mockResolvedValue(undefined);
  });

  it('loads with normalized search, status, warehouse and pagination filters', async () => {
    const state = createSalesOrdersState();
    await state.load();
    state.setSearch(' SO-41 ');
    state.setStatus('OPEN');
    state.setWarehouseId(2);
    state.setPage(2);
    await state.load();

    expect(deps.listSalesOrders.execute).toHaveBeenLastCalledWith({
      status: 'OPEN',
      warehouseId: 2,
      q: ' SO-41 ',
      page: 2,
      perPage: 50,
      excludePostFulfillment: true
    });
    expect(state.orders).toEqual([order]);
    expect(state.pagination.total).toBe(101);
    expect(state.loading).toBe(false);
    expect(state.loadedOnce).toBe(true);
  });

  it('preserves all supported create contract fields through the UI state adapter', async () => {
    const state = createSalesOrdersState();
    const input = {
      salesOrderNumber: 'SO-NEW',
      soBarcode: 'SO-NEW-BARCODE',
      warehouseId: 2,
      customerName: 'Customer',
      customerEmail: 'customer@example.test',
      customerPhone: '555',
      customerAddress: 'Legacy customer address',
      orderOrigin: 'MARKETPLACE',
      shipAddress: 'Delivery address',
      shipMethod: 'GROUND',
      shipByDate: '2026-12-01',
      memo: 'Created from operator screen',
      lines: [{ itemId: 7, quantityOrdered: 3 }]
    };

    await expect(state.create(input)).resolves.toBe(true);
    expect(deps.createSalesOrder.execute).toHaveBeenCalledWith({
      soNumber: 'SO-NEW',
      soBarcode: 'SO-NEW-BARCODE',
      warehouseId: 2,
      customerName: 'Customer',
      customerEmail: 'customer@example.test',
      customerPhone: '555',
      customerAddress: 'Legacy customer address',
      orderOrigin: 'MARKETPLACE',
      shipAddress: 'Delivery address',
      shipMethod: 'GROUND',
      shipByDate: '2026-12-01',
      memo: 'Created from operator screen',
      lines: [{ itemId: 7, quantityOrdered: 3 }]
    });
    expect(state.selected).toBeNull();
    expect(state.page).toBe(1);
  });

  it('refreshes the selected order after a successful mutation', async () => {
    const state = createSalesOrdersState();
    await state.open(41);
    await expect(state.update(41, { memo: 'Updated memo' })).resolves.toBe(true);

    expect(deps.updateSalesOrder.execute).toHaveBeenCalledWith(41, { memo: 'Updated memo' });
    expect(deps.getSalesOrder.execute).toHaveBeenCalledTimes(2);
    expect(state.selected).toBe(order);
    expect(state.saving).toBe(false);
  });

  it('loads related orders and bins only for the currently selected order', async () => {
    const state = createSalesOrdersState();
    await state.open(41);
    await state.loadRelated();
    deps.getAvailableSalesOrderBins.execute.mockResolvedValueOnce([{
      binId: 3, binCode: 'A-03', quantityAvailable: 5, preferredPriority: 1
    }]);
    await state.loadAvailableBins(9);

    expect(deps.getRelatedSalesOrders.execute).toHaveBeenCalledWith(41);
    expect(deps.getAvailableSalesOrderBins.execute).toHaveBeenCalledWith(41, 9);
    expect(state.availableBinsByLine[9]).toHaveLength(1);
    expect(state.loadingBinsByLine[9]).toBeUndefined();
  });

  it('keeps server mutation errors visible without claiming success', async () => {
    deps.updateSalesOrder.execute.mockRejectedValueOnce(new Error('Sales order is locked'));
    const state = createSalesOrdersState();
    await state.open(41);

    await expect(state.update(41, { memo: 'Change' })).resolves.toBe(false);
    expect(state.error).toContain('Sales order is locked');
    expect(state.saving).toBe(false);
  });
});
