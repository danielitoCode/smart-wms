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
});
