import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  list: { execute: vi.fn() },
  detail: { execute: vi.fn() },
  cancel: { execute: vi.fn() }
}));
vi.mock('../../../../../core/feature/backorders/di/backorders.dependencies', () => ({
  createBackordersDependencies: () => deps
}));

import { createBackordersState } from '../../../../../core/feature/backorders/ui/state/backordersState.svelte';

const row = {
  salesOrderId: 41, salesOrderNumber: 'BO-41', warehouseId: 3,
  status: 'WAITING_STOCK', items: []
};
const detail = {
  order: { salesOrderId: 41, salesOrderNumber: 'BO-41' },
  parentSalesOrder: null, lines: [], totalQuantityPending: 2, totalQuantityResolved: 0
};

describe('backorders UI state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.list.execute.mockResolvedValue([row]);
    deps.detail.execute.mockResolvedValue(detail);
    deps.cancel.execute.mockResolvedValue(undefined);
  });

  it('loads the requested queue tab within the active warehouse scope', async () => {
    const state = createBackordersState();
    await state.load(3, 'ready-to-ship');
    expect(deps.list.execute).toHaveBeenCalledWith(3, 'ready-to-ship');
    expect(state.rows).toEqual([row]);
    expect(state.tab).toBe('ready-to-ship');
    expect(state.loading).toBe(false);
  });

  it('loads detail through the dedicated detail use case', async () => {
    const state = createBackordersState();
    await state.loadDetail(41);
    expect(deps.detail.execute).toHaveBeenCalledWith(41);
    expect(state.detail).toEqual(detail);
    expect(state.detailLoading).toBe(false);
  });

  it('cancels only after the cancellation use case succeeds', async () => {
    const state = createBackordersState();
    expect(await state.cancel(41, 'found')).toBe(true);
    expect(deps.cancel.execute).toHaveBeenCalledWith(41, 'found');
    expect(state.saving).toBe(false);
  });

  it('preserves the loaded queue and exposes a failed cancellation', async () => {
    const state = createBackordersState();
    await state.load(3, 'waiting');
    deps.cancel.execute.mockRejectedValueOnce(new Error('already shipped'));
    expect(await state.cancel(41, 'other')).toBe(false);
    expect(state.rows).toEqual([row]);
    expect(state.error).toContain('already shipped');
    expect(state.saving).toBe(false);
  });

  it('ignores stale queue responses after a newer tab/scope request', async () => {
    const state = createBackordersState();
    const staleRow = { ...row, salesOrderId: 99, salesOrderNumber: 'BO-STALE' };
    let resolveOld!: (value: typeof row[]) => void;
    deps.list.execute.mockImplementationOnce(() => new Promise(resolve => {
      resolveOld = resolve;
    }));
    const oldRequest = state.load(3, 'waiting');
    await state.load(4, 'ready-to-ship');
    resolveOld([staleRow]);
    await oldRequest;
    expect(state.rows).toEqual([row]);
    expect(deps.list.execute).toHaveBeenNthCalledWith(2, 4, 'ready-to-ship');
  });
});
