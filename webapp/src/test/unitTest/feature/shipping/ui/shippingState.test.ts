import { beforeEach, describe, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({ loadOrder: { execute: vi.fn() }, fulfill: { execute: vi.fn() } }));
vi.mock('../../../../../core/feature/shipping/di/shipping.dependencies', () => ({ createShippingDependencies: () => deps }));
import { createShippingState } from '../../../../../core/feature/shipping/ui/state/shippingState.svelte';

const context = { warehouseId: 6, generation: 1, requireWarehouseId: () => context.warehouseId };
const detail = { salesOrder: { soId: 2, soNumber: 'SO-2', status: 'PACKED', warehouseId: 6 }, lines: [], totalItems: 0, totalLines: 0 };

describe('Shipping scanner state warehouse context', () => {
 beforeEach(() => { context.warehouseId = 6; context.generation = 1; vi.clearAllMocks(); deps.loadOrder.execute.mockResolvedValue(detail); deps.fulfill.execute.mockResolvedValue({ message: 'Shipment fulfilled', fulfillmentId: 11, soNumber: 'SO-2', trackingNumber: 'TRACK', carrier: 'Carrier', linesShipped: 1, totalQuantity: 2 }); });
 it('loads the order in the selected warehouse but blocks shipping without package validation', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); expect(await state.load()).toBe(true);
  expect(deps.loadOrder.execute).toHaveBeenCalledWith('SO-2', 6);
  state.setTrackingNumber('TRACK'); state.setCarrier('Carrier');
  expect(state.shippingExecutionAvailable).toBe(false);
  expect(await state.fulfill()).toBe(false);
  expect(deps.fulfill.execute).not.toHaveBeenCalled();
  expect(state.error).toContain('Flask');
 });
 it('blocks fulfillment when the selected warehouse no longer matches the loaded order', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); await state.load();
  context.warehouseId = 9; context.generation++; state.setTrackingNumber('T'); state.setCarrier('C');
  expect(await state.fulfill()).toBe(false);
  expect(deps.fulfill.execute).not.toHaveBeenCalled();
 });
 it('clears order and shipment fields after warehouse changes', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); await state.load(); state.setTrackingNumber('T');
  context.warehouseId = 9; context.generation++;
  state.onWarehouseChanged();
  expect(state.detail).toBeNull(); expect(state.trackingNumber).toBe('');
 });
 it('discards an order lookup completed for a previous warehouse', async () => {
  let resolveOrder!: (value: typeof detail) => void;
  deps.loadOrder.execute.mockReturnValueOnce(new Promise(resolve => { resolveOrder = resolve; }));
  const state = createShippingState(context as never);
  state.setBarcode('SO-2');
  const pending = state.load();
  context.warehouseId = 9; context.generation++;
  state.onWarehouseChanged();
  resolveOrder(detail);
  expect(await pending).toBe(false);
  expect(state.detail).toBeNull();
 });

 it('fails closed for fulfillment without a physical package contract', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); await state.load();
  state.setTrackingNumber('TRACK'); state.setCarrier('Carrier');
  expect(await state.fulfill()).toBe(false);
  expect(deps.fulfill.execute).not.toHaveBeenCalled();
  expect(state.error).toContain('Flask');
 });

 it('rejects a loaded order when warehouse generation changes even if the id is unchanged', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); await state.load();
  context.generation = 2;
  state.setTrackingNumber('TRACK'); state.setCarrier('Carrier');
  expect(await state.fulfill()).toBe(false);
  expect(deps.fulfill.execute).not.toHaveBeenCalled();
 });
 it('discards an order lookup response from an obsolete warehouse generation', async () => {
  const state = createShippingState(context as never);
  let resolveLoad!: (value: typeof detail) => void;
  deps.loadOrder.execute.mockImplementationOnce(() => new Promise(resolve => { resolveLoad = resolve; }));
  state.setBarcode('SO-2');
  const pending = state.load();
  context.generation = 2;
  state.onWarehouseChanged();
  resolveLoad(detail);
  expect(await pending).toBe(false);
  expect(state.detail).toBeNull();
 });

});
