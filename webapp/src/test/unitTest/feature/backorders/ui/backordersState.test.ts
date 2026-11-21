import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Backorder, BackorderAuditHistoryPage, BackorderDetail
} from '../../../../../core/feature/backorders/domain/entity/Backorder';

const deps = vi.hoisted(() => ({
  list: { execute: vi.fn() },
  detail: { execute: vi.fn() },
  auditHistory: { execute: vi.fn() },
  cancel: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/backorders/di/backorders.dependencies', () => ({
  createBackordersDependencies: () => deps
}));

import { createBackordersState } from '../../../../../core/feature/backorders/ui/state/backordersState.svelte';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function row(id: number, warehouseId = 3): Backorder {
  return {
    salesOrderId: id,
    salesOrderNumber: `BO-${id}`,
    parentSalesOrderId: 10,
    parentSalesOrderNumber: 'SO-10',
    warehouseId,
    customerName: 'Customer',
    status: 'WAITING_STOCK',
    openedAt: '2026-11-01T00:00:00Z',
    fulfillableSince: null,
    daysWaiting: 2,
    items: []
  };
}

function detail(id: number): BackorderDetail {
  return {
    order: {
      salesOrderId: id,
      warehouseId: 3,
      status: 'OPEN',
      lines: [{
        soLineId: 1,
        quantityOrdered: 8,
        quantityAllocated: 5,
        quantityPicked: 0,
        quantityPacked: 0,
        quantityShipped: 0
      }]
    } as BackorderDetail['order'],
    parentSalesOrder: null,
    lines: [],
    totalQuantityPending: 8,
    totalQuantityResolved: 0
  };
}

const history = (page = 1): BackorderAuditHistoryPage => ({
  entries: [{
    logId: page,
    actionType: 'CANCEL',
    username: 'operator',
    warehouseId: 3,
    details: { page },
    createdAt: '2026-11-20T10:00:00Z'
  }],
  page,
  perPage: 20,
  total: 21,
  pages: 2
});

describe('backordersState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.list.execute.mockResolvedValue([row(1)]);
    deps.detail.execute.mockImplementation(async (id: number) => detail(id));
    deps.auditHistory.execute.mockImplementation(async (_id: number, page = 1) => history(page));
    deps.cancel.execute.mockResolvedValue(undefined);
  });

  it('keeps the latest queue result when warehouse and tab change during requests', async () => {
    const first = deferred<Backorder[]>();
    const second = deferred<Backorder[]>();
    deps.list.execute.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const state = createBackordersState();
    const firstLoad = state.load(3, 'waiting');
    const secondLoad = state.load(4, 'ready-to-ship');

    second.resolve([row(2, 4)]);
    await secondLoad;
    first.resolve([row(1, 3)]);
    await firstLoad;

    expect(state.rows.map((entry) => entry.salesOrderId)).toEqual([2]);
    expect(state.tab).toBe('ready-to-ship');
    expect(state.loading).toBe(false);
    expect(deps.list.execute).toHaveBeenNthCalledWith(2, 4, 'ready-to-ship');
  });

  it('keeps the newest detail when two backorders are opened quickly', async () => {
    const first = deferred<BackorderDetail>();
    const second = deferred<BackorderDetail>();
    deps.detail.execute.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const state = createBackordersState();
    const firstLoad = state.loadDetail(1);
    const secondLoad = state.loadDetail(2);

    second.resolve(detail(2));
    await secondLoad;
    first.resolve(detail(1));
    await firstLoad;

    expect(state.detail?.order.salesOrderId).toBe(2);
    expect(state.detailLoading).toBe(false);
  });

  it('discards audit history that completes after another detail has been selected', async () => {
    const oldHistory = deferred<BackorderAuditHistoryPage>();
    deps.auditHistory.execute.mockReturnValueOnce(oldHistory.promise);

    const state = createBackordersState();
    await state.loadDetail(1);
    const pendingHistory = state.loadAuditHistory(1, 1);
    await state.loadDetail(2);
    oldHistory.resolve(history(1));
    expect(await pendingHistory).toBe(false);

    expect(state.detail?.order.salesOrderId).toBe(2);
    expect(state.auditEntries).toEqual([]);
    expect(state.auditTotal).toBe(0);
  });

  it('loads audit pagination and preserves event metadata', async () => {
    const state = createBackordersState();
    await state.loadDetail(1);

    expect(await state.loadAuditHistory(1, 2)).toBe(true);
    expect(deps.auditHistory.execute).toHaveBeenCalledWith(1, 2);
    expect(state.auditEntries[0]).toMatchObject({ logId: 2, actionType: 'CANCEL', warehouseId: 3 });
    expect(state.auditPage).toBe(2);
    expect(state.auditPages).toBe(2);
    expect(state.auditTotal).toBe(21);
  });

  it('rejects a second cancellation while the first server request is pending', async () => {
    const pending = deferred<void>();
    deps.cancel.execute.mockReturnValueOnce(pending.promise);
    const state = createBackordersState();

    const first = state.cancel(41, 'found', 3);
    const second = await state.cancel(41, 'other', 3);

    expect(second).toBe(false);
    expect(deps.cancel.execute).toHaveBeenCalledTimes(1);
    expect(state.saving).toBe(true);

    pending.resolve();
    expect(await first).toBe(true);
    expect(state.saving).toBe(false);
  });

  it('does not fabricate inventory release locally after cancellation', async () => {
    const state = createBackordersState();
    await state.loadDetail(41);
    const before = state.detail?.order.lines[0].quantityAllocated;

    expect(await state.cancel(41, 'customer_asked', 3)).toBe(true);

    expect(deps.cancel.execute).toHaveBeenCalledWith(41, 'customer_asked', 3);
    expect(state.detail?.order.lines[0].quantityAllocated).toBe(before);
  });

  it('keeps cancellation errors visible and always releases the saving guard', async () => {
    deps.cancel.execute.mockRejectedValueOnce(new Error('conflict'));
    const state = createBackordersState();

    expect(await state.cancel(41, 'other', 3)).toBe(false);
    expect(state.error).toBe('conflict');
    expect(state.saving).toBe(false);
  });
});
