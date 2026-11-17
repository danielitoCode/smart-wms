import { beforeEach, describe, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({
 loadOrder: { execute: vi.fn() }, verify: { execute: vi.fn() }, complete: { execute: vi.fn() }
}));
vi.mock('../../../../../core/feature/packing/di/packing.dependencies', () => ({ createPackingDependencies: () => deps }));
import { createPackingState } from '../../../../../core/feature/packing/ui/state/packingState.svelte';

const context = { warehouseId: 7, requireWarehouseId: () => context.warehouseId };
const detail = { salesOrder: { soId: 3, soNumber: 'SO-3', status: 'PICKED', warehouseId: 7 }, lines: [], calculatedWeightLbs: 0, totalItems: 0, itemsVerified: 0 };

describe('Packing scanner state warehouse context', () => {
 beforeEach(() => { vi.clearAllMocks(); deps.loadOrder.execute.mockResolvedValue(detail); deps.verify.execute.mockResolvedValue({ message: 'Item verified' }); deps.complete.execute.mockResolvedValue({ message: 'Packed' }); });
 it('loads order using selected warehouse and verifies scan', async () => {
  const state = createPackingState(context as never);
  state.setBarcode(' SO-3 ');
  expect(await state.load()).toBe(true);
  expect(deps.loadOrder.execute).toHaveBeenCalledWith('SO-3', 7);
  state.setScannedBarcode('UPC-3');
  expect(await state.verify()).toBe(true);
  expect(deps.verify.execute).toHaveBeenCalledWith({ soId: 3, scannedBarcode: 'UPC-3', quantity: 1 });
 });
 it('rejects a stale order after warehouse context changes', async () => {
  const state = createPackingState(context as never);
  state.setBarcode('SO-3'); await state.load();
  context.warehouseId = 8;
  expect(await state.verify()).toBe(false);
  expect(deps.verify.execute).not.toHaveBeenCalled();
 });
 it('clears loaded order when warehouse selection changes', async () => {
  const state = createPackingState(context as never);
  state.setBarcode('SO-3'); await state.load();
  state.onWarehouseChanged();
  expect(state.detail).toBeNull();
 });
});
