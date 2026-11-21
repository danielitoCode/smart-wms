import { describe, expect, it, vi } from 'vitest';
import { createTransferOrdersState } from '../../../../../core/feature/transfer-orders/ui/state/transferOrdersState.svelte';
import { authSession } from '../../../../../core/infrastructure/auth/AuthSession';

function dependencies() {
  authSession.setUser({ userId: 7, username: 'test', fullName: 'Test', role: 'USER', warehouseIds: [1, 2, 4], allowedPages: [], allowedFunctions: [], allowedOverrides: [], mustChangePassword: false });
  return {
    list: { execute: vi.fn().mockResolvedValue({ orders: [], total: 0, page: 1, pages: 1, perPage: 50 }) },
    detail: { execute: vi.fn().mockResolvedValue({
      transferOrderId: 12, transferOrderNumber: 'TO-12', status: 'OPEN',
      lines: [], approvals: [], sourceWarehouseId: 2, destinationWarehouseId: 4
    }) },
    pickerDetail: { execute: vi.fn().mockResolvedValue({}) },
    remove: { execute: vi.fn().mockResolvedValue(undefined) },
    create: { execute: vi.fn() },
    warehouses: { execute: vi.fn().mockResolvedValue([1, 2, 4, 9].map(warehouseId => ({ warehouseId, warehouseCode: 'WH-' + warehouseId, warehouseName: 'Warehouse ' + warehouseId, active: true }))) },
    startPicking: { execute: vi.fn() },
    submitPickerResult: { execute: vi.fn() },
    approve: { execute: vi.fn() },
    reject: { execute: vi.fn() },
    cancel: { execute: vi.fn() },
    shortClose: { execute: vi.fn() }
  };
}

describe('transfer orders UI state', () => {
  it('fails closed for delete, cancel, picking and approval while the staged lifecycle is unsupported', async () => {
    const deps = dependencies();
    const state = createTransferOrdersState(deps as never);
    await state.detail(12);

    await expect(state.remove(12)).resolves.toBe(false);
    await expect(state.cancel(12)).resolves.toBe(false);
    await expect(state.startPicking(12)).resolves.toBe(false);
    await expect(state.submitPickerResult(12)).resolves.toBe(false);
    await expect(state.approve(12, 8)).resolves.toBe(false);
    await expect(state.reject(12, 8, 'damaged')).resolves.toBe(false);
    await expect(state.shortClose(12, 31)).resolves.toBe(false);
    await expect(state.create({
      sourceWarehouseCode: 'WH-2', destinationWarehouseCode: 'WH-4',
      notes: null, records: [{ sku: 'SKU-7', quantity: 1 }]
    })).resolves.toBe(false);

    expect(state.lifecycleAvailable).toBe(false);
    expect(deps.remove.execute).not.toHaveBeenCalled();
    expect(deps.cancel.execute).not.toHaveBeenCalled();
    expect(deps.startPicking.execute).not.toHaveBeenCalled();
    expect(deps.submitPickerResult.execute).not.toHaveBeenCalled();
    expect(deps.approve.execute).not.toHaveBeenCalled();
    expect(deps.reject.execute).not.toHaveBeenCalled();
    expect(deps.shortClose.execute).not.toHaveBeenCalled();
    expect(deps.create.execute).not.toHaveBeenCalled();
    expect(state.error).toContain('no está disponible');
  });

  it('filters list results unless both warehouses are in the authorized warehouse list', async () => {
    const deps = dependencies();
    deps.list.execute.mockResolvedValue({
      orders: [
        { transferOrderId: 1, sourceWarehouseId: 2, destinationWarehouseId: 4 },
        { transferOrderId: 2, sourceWarehouseId: 2, destinationWarehouseId: 9 }
      ], total: 2, page: 1, pages: 1, perPage: 50
    });
    const state = createTransferOrdersState(deps as never);
    await state.load();
    expect(state.rows.map(row => row.transferOrderId)).toEqual([1]);
    expect(state.warehouses.map(row => row.warehouseId)).toEqual([1, 2, 4]);
  });

  it('rejects a detail unless the user can access both warehouses', async () => {
    const deps = dependencies();
    deps.detail.execute.mockResolvedValue({
      transferOrderId: 99, transferOrderNumber: 'TO-99', status: 'OPEN',
      lines: [], approvals: [], sourceWarehouseId: 2, destinationWarehouseId: 9
    });
    const state = createTransferOrdersState(deps as never);
    await state.detail(99);
    expect(state.selected).toBeNull();
    expect(state.error).toContain('No tienes acceso');
  });

  it('keeps the latest transfer detail when two rows are opened in quick succession', async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    const deps = dependencies();
    deps.detail.execute
      .mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise(resolve => { resolveSecond = resolve; }));
    const state = createTransferOrdersState(deps as never);
    const first = state.detail(12);
    const second = state.detail(13);
    resolveSecond({
      transferOrderId: 13, transferOrderNumber: 'TO-13', status: 'OPEN',
      lines: [], approvals: [], sourceWarehouseId: 2, destinationWarehouseId: 4
    });
    await second;
    resolveFirst({
      transferOrderId: 12, transferOrderNumber: 'TO-12', status: 'OPEN',
      lines: [], approvals: [], sourceWarehouseId: 2, destinationWarehouseId: 4
    });
    await first;
    expect(state.selected?.transferOrderId).toBe(13);
  });

  it('clears selected transfer details when returning to a differently filtered queue', async () => {
    const deps = dependencies();
    const state = createTransferOrdersState(deps as never);
    await state.detail(12);
    expect(state.selected?.transferOrderId).toBe(12);
    state.setSourceWarehouse(2);
    expect(state.selected).toBeNull();
    expect(state.pickerSnapshot).toBeNull();
  });

});
