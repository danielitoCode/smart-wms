import { describe, expect, it, vi } from 'vitest';
import { createTransferOrdersState } from '../../../../../core/feature/transfer-orders/ui/state/transferOrdersState.svelte';
import { ApiError } from '../../../../../core/infrastructure/errors/ApiError';

function dependencies() {
  return {
    list: { execute: vi.fn().mockResolvedValue({ orders: [], total: 0, page: 1, pages: 1, perPage: 50 }) },
    detail: { execute: vi.fn().mockResolvedValue({
      transferOrderId: 12, transferOrderNumber: 'TO-12', status: 'OPEN',
      lines: [], approvals: [], sourceWarehouseId: 2, destinationWarehouseId: 4
    }) },
    pickerDetail: { execute: vi.fn().mockResolvedValue({}) },
    remove: { execute: vi.fn().mockResolvedValue(undefined) },
    create: { execute: vi.fn() },
    warehouses: { execute: vi.fn().mockResolvedValue([]) },
    startPicking: { execute: vi.fn() },
    submitPickerResult: { execute: vi.fn() },
    approve: { execute: vi.fn() },
    reject: { execute: vi.fn() },
    cancel: { execute: vi.fn() },
    shortClose: { execute: vi.fn() }
  };
}

describe('transfer orders UI state', () => {
  it('keeps the selected order visible when delete fails', async () => {
    const deps = dependencies();
    const state = createTransferOrdersState(deps as never);
    await state.detail(12);
    deps.remove.execute.mockRejectedValueOnce(new Error('conflict'));
    await expect(state.remove(12)).resolves.toBe(false);
    expect(state.selected?.transferOrderId).toBe(12);
    expect(state.error).toContain('conflict');
  });

  it('clears the selected order only after a successful delete', async () => {
    const deps = dependencies();
    const state = createTransferOrdersState(deps as never);
    await state.detail(12);
    await expect(state.remove(12)).resolves.toBe(true);
    expect(state.selected).toBeNull();
    expect(deps.remove.execute).toHaveBeenCalledWith(12);
    expect(deps.list.execute).toHaveBeenCalledTimes(1);
  });

  it('surfaces HTTP 409 conflicts without refreshing away the current detail', async () => {
    const deps = dependencies();
    const state = createTransferOrdersState(deps as never);
    await state.detail(12);
    deps.cancel.execute.mockRejectedValueOnce(new ApiError(409, 'Transfer already has a pending approval', 'conflict'));
    await expect(state.cancel(12)).resolves.toBe(false);
    expect(state.error).toBe('Transfer already has a pending approval');
    expect(state.selected?.transferOrderId).toBe(12);
    expect(deps.detail.execute).toHaveBeenCalledTimes(1);
  });

  it('maps HTTP 422 row validation details from a failed import', async () => {
    const deps = dependencies();
    const state = createTransferOrdersState(deps as never);
    deps.create.execute.mockRejectedValueOnce(new ApiError(422, 'Invalid import rows', 'unprocessable', {
      rows: [{ row_index: 2, error_kind: 'quantity_exceeds_limit', sku: 'SKU-7' }]
    }));
    await expect(state.create({
      sourceWarehouseCode: 'WH-A', destinationWarehouseCode: 'WH-B',
      notes: null, records: [{ sku: 'SKU-7', quantity: 1000001 }]
    })).resolves.toBe(false);
    expect(state.error).toBe('Invalid import rows');
    expect(state.importErrors).toEqual([{ rowIndex: 2, errorKind: 'quantity_exceeds_limit', sku: 'SKU-7' }]);
    expect(deps.list.execute).not.toHaveBeenCalled();
  });

  it('dispatches each supported transfer operation and refreshes the selected order', async () => {
    const deps = dependencies();
    deps.startPicking.execute.mockResolvedValue({ batchNumber: 'B-3', tasksCreated: 2 });
    deps.submitPickerResult.execute.mockResolvedValue({ approvalId: 8, lineCount: 1 });
    const state = createTransferOrdersState(deps as never);
    await state.detail(12);

    await expect(state.startPicking(12)).resolves.toBe(true);
    await expect(state.submitPickerResult(12)).resolves.toBe(true);
    await expect(state.approve(12, 8)).resolves.toBe(true);
    await expect(state.reject(12, 8, 'damaged')).resolves.toBe(true);
    await expect(state.shortClose(12, 31)).resolves.toBe(true);
    await expect(state.cancel(12)).resolves.toBe(true);

    expect(deps.startPicking.execute).toHaveBeenCalledWith(12);
    expect(deps.submitPickerResult.execute).toHaveBeenCalledWith(12);
    expect(deps.approve.execute).toHaveBeenCalledWith(12, 8);
    expect(deps.reject.execute).toHaveBeenCalledWith(12, 8, 'damaged');
    expect(deps.shortClose.execute).toHaveBeenCalledWith(12, 31);
    expect(deps.cancel.execute).toHaveBeenCalledWith(12);
    expect(deps.detail.execute).toHaveBeenCalledTimes(7);
  });

  it('rejects a repeated mutation while the first request is still pending', async () => {
    const deps = dependencies();
    let finish!: (value: { batchNumber: string; tasksCreated: number }) => void;
    deps.startPicking.execute.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const state = createTransferOrdersState(deps as never);

    const first = state.startPicking(12);
    expect(state.saving).toBe(true);
    await expect(state.startPicking(12)).resolves.toBe(false);
    expect(deps.startPicking.execute).toHaveBeenCalledTimes(1);

    finish({ batchNumber: 'B-3', tasksCreated: 1 });
    await expect(first).resolves.toBe(true);
    expect(state.saving).toBe(false);
  });

});
