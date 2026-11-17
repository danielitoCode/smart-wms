import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Backorder, BackorderDetail } from '../../../../../core/feature/backorders/domain/entity/Backorder';

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
  salesOrderId: 41,
  salesOrderNumber: 'BO-41',
  warehouseId: 3,
  status: 'WAITING_STOCK',
  daysWaiting: 12,
  items: []
} as unknown as Backorder;

const detail = {
  order: { salesOrderId: 41 },
  parentSalesOrder: { salesOrderId: 10 },
  lines: [],
  totalQuantityPending: 4,
  totalQuantityResolved: 1
} as unknown as BackorderDetail;

describe('Backorders UI state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.list.execute.mockResolvedValue([row]);
    deps.detail.execute.mockResolvedValue(detail);
    deps.cancel.execute.mockResolvedValue(undefined);
  });

  it('loads the requested queue using the selected warehouse and tab', async () => {
    const state = createBackordersState();
    await state.load(3, 'ready-to-ship');

    expect(deps.list.execute).toHaveBeenCalledWith(3, 'ready-to-ship');
    expect(state.rows).toEqual([row]);
    expect(state.tab).toBe('ready-to-ship');
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('does not allow an older queue response to overwrite the latest scope', async () => {
    let resolveOld!: (rows: Backorder[]) => void;
    let resolveNew!: (rows: Backorder[]) => void;
    deps.list.execute
      .mockReturnValueOnce(new Promise<Backorder[]>((resolve) => (resolveOld = resolve)))
      .mockReturnValueOnce(new Promise<Backorder[]>((resolve) => (resolveNew = resolve)));

    const state = createBackordersState();
    const oldLoad = state.load(1, 'waiting');
    const newLoad = state.load(3, 'ready-to-ship');
    resolveNew([row]);
    await newLoad;
    resolveOld([]);
    await oldLoad;

    expect(state.rows).toEqual([row]);
    expect(state.tab).toBe('ready-to-ship');
    expect(state.loading).toBe(false);
  });

  it('loads detail and ignores a response for a superseded backorder', async () => {
    const older = { ...detail, totalQuantityPending: 1 };
    let resolveOld!: (value: BackorderDetail) => void;
    deps.detail.execute
      .mockReturnValueOnce(new Promise<BackorderDetail>((resolve) => (resolveOld = resolve)))
      .mockResolvedValueOnce(detail);

    const state = createBackordersState();
    const oldLoad = state.loadDetail(40);
    await state.loadDetail(41);
    resolveOld(older);
    await oldLoad;

    expect(deps.detail.execute).toHaveBeenNthCalledWith(1, 40);
    expect(deps.detail.execute).toHaveBeenNthCalledWith(2, 41);
    expect(state.detail).toBe(detail);
    expect(state.detailLoading).toBe(false);
  });

  it('serializes cancellation and reports the repository result', async () => {
    let resolveCancel!: () => void;
    deps.cancel.execute.mockReturnValueOnce(
      new Promise<void>((resolve) => (resolveCancel = resolve))
    );
    const state = createBackordersState();
    const first = state.cancel(41, 'other');
    expect(state.saving).toBe(true);

    await expect(state.cancel(41, 'other')).resolves.toBe(false);
    expect(deps.cancel.execute).toHaveBeenCalledTimes(1);

    resolveCancel();
    await expect(first).resolves.toBe(true);
    expect(state.saving).toBe(false);
  });

  it('keeps a server cancellation error visible and can clear it', async () => {
    deps.cancel.execute.mockRejectedValueOnce(new Error('Backorder is no longer cancellable'));
    const state = createBackordersState();

    await expect(state.cancel(41, 'other')).resolves.toBe(false);
    expect(state.error).toContain('Backorder is no longer cancellable');
    state.clearError();
    expect(state.error).toBeNull();
    expect(state.detailError).toBeNull();
  });
});
