import { beforeEach, describe, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({
 loadOrder: { execute: vi.fn() }, verify: { execute: vi.fn() }, complete: { execute: vi.fn() }
}));
vi.mock('../../../../../core/feature/packing/di/packing.dependencies', () => ({ createPackingDependencies: () => deps }));
import { createPackingState } from '../../../../../core/feature/packing/ui/state/packingState.svelte';

const context = { warehouseId: 7, generation: 1, requireWarehouseId: () => context.warehouseId };
const detail = { salesOrder: { soId: 3, soNumber: 'SO-3', status: 'PICKED', warehouseId: 7 }, lines: [], calculatedWeightLbs: 0, totalItems: 0, itemsVerified: 0 };

describe('Packing scanner state warehouse context', () => {
 beforeEach(() => { context.warehouseId = 7; context.generation = 1; vi.clearAllMocks(); deps.loadOrder.execute.mockResolvedValue(detail); deps.verify.execute.mockResolvedValue({ message: 'Item verified' }); deps.complete.execute.mockResolvedValue({ message: 'Packed' }); });
 it('loads order using selected warehouse and verifies scan', async () => {
  const state = createPackingState(context as never);
  state.setBarcode(' SO-3 ');
  expect(await state.load()).toBe(true);
  expect(deps.loadOrder.execute).toHaveBeenCalledWith('SO-3', 7);
  state.setScannedBarcode('UPC-3');
  expect(await state.verify()).toBe(true);
  expect(deps.verify.execute).toHaveBeenCalledWith({ soId: 3, warehouseId: 7, scannedBarcode: 'UPC-3', quantity: 1 });
 });
 it('rejects a stale order after warehouse context changes', async () => {
  const state = createPackingState(context as never);
  state.setBarcode('SO-3'); await state.load();
  context.warehouseId = 8; context.generation++;
  expect(await state.verify()).toBe(false);
  expect(deps.verify.execute).not.toHaveBeenCalled();
 });
 it('clears loaded order when warehouse selection changes', async () => {
  const state = createPackingState(context as never);
  state.setBarcode('SO-3'); await state.load();
  context.warehouseId = 8; context.generation++;
  state.onWarehouseChanged();
  expect(state.detail).toBeNull();
 });
 it('does not restore an order when a load resolves after warehouse context changed', async () => {
  let resolveOrder!: (value: typeof detail) => void;
  deps.loadOrder.execute.mockReturnValueOnce(new Promise(resolve => { resolveOrder = resolve; }));
  const state = createPackingState(context as never);
  state.setBarcode('SO-3');
  const pending = state.load();
  context.warehouseId = 8; context.generation++;
  state.onWarehouseChanged();
  resolveOrder(detail);
  expect(await pending).toBe(false);
  expect(state.detail).toBeNull();
 });

 it('does not allow packing completion until every picked unit is verified', async () => {
  deps.loadOrder.execute.mockResolvedValueOnce({ ...detail, lines: [{ sku: 'SKU-1', quantityPicked: 2, quantityPacked: 1 }] });
  const state = createPackingState(context as never);
  state.setBarcode('SO-3'); await state.load();
  expect(state.allVerified).toBe(false);
  expect(await state.complete()).toBe(false);
  expect(deps.complete.execute).not.toHaveBeenCalled();
 });

 it('reconciles packed quantity from Flask after an uncertain scan failure before allowing another scan', async () => {
  const state = createPackingState(context as never);
  state.setBarcode('SO-3');
  await state.load();
  state.setScannedBarcode('UPC-3');
  deps.verify.execute.mockRejectedValueOnce(new Error('timeout'));
  deps.loadOrder.execute.mockResolvedValueOnce({
   ...detail,
   lines: [{ sku: 'SKU-3', quantityPicked: 2, quantityPacked: 1, packVerified: false }],
   totalItems: 2,
   itemsVerified: 1
  });
  expect(await state.verify()).toBe(false);
  expect(state.detail?.lines[0].quantityPacked).toBe(1);
  expect(state.reconciliationRequired).toBe(false);
  expect(deps.loadOrder.execute).toHaveBeenCalledTimes(2);
 });

 it('discards a load response after the warehouse generation changes even if the id is reused', async () => {
  const state = createPackingState(context as never);
  let resolveLoad!: (value: typeof detail) => void;
  deps.loadOrder.execute.mockImplementationOnce(() => new Promise(resolve => { resolveLoad = resolve; }));
  state.setBarcode('SO-3');
  const pending = state.load();
  context.generation = 2;
  state.onWarehouseChanged();
  resolveLoad(detail);
  expect(await pending).toBe(false);
  expect(state.detail).toBeNull();
 });

});
