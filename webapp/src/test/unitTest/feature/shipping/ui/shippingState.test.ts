import { beforeEach, describe, expect, it, vi } from 'vitest';
const deps = vi.hoisted(() => ({ loadOrder: { execute: vi.fn() }, fulfill: { execute: vi.fn() } }));
vi.mock('../../../../../core/feature/shipping/di/shipping.dependencies', () => ({ createShippingDependencies: () => deps }));
import { createShippingState } from '../../../../../core/feature/shipping/ui/state/shippingState.svelte';

const context = { warehouseId: 6, requireWarehouseId: () => context.warehouseId };
const detail = { salesOrder: { soId: 2, soNumber: 'SO-2', status: 'PACKED', warehouseId: 6 }, lines: [], totalItems: 0, totalLines: 0 };

describe('Shipping scanner state warehouse context', () => {
 beforeEach(() => { vi.clearAllMocks(); deps.loadOrder.execute.mockResolvedValue(detail); deps.fulfill.execute.mockResolvedValue({ message: 'Shipment fulfilled', fulfillmentId: 11, soNumber: 'SO-2', trackingNumber: 'TRACK', carrier: 'Carrier', linesShipped: 1, totalQuantity: 2 }); });
 it('loads the order in the selected warehouse and fulfills it', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); expect(await state.load()).toBe(true);
  expect(deps.loadOrder.execute).toHaveBeenCalledWith('SO-2', 6);
  state.setTrackingNumber('TRACK'); state.setCarrier('Carrier');
  expect(await state.fulfill()).toBe(true);
  expect(deps.fulfill.execute).toHaveBeenCalledWith({ soId: 2, warehouseId: 6, trackingNumber: 'TRACK', carrier: 'Carrier', shipMethod: null });
 });
 it('blocks fulfillment when the selected warehouse no longer matches the loaded order', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); await state.load();
  context.warehouseId = 9; state.setTrackingNumber('T'); state.setCarrier('C');
  expect(await state.fulfill()).toBe(false);
  expect(deps.fulfill.execute).not.toHaveBeenCalled();
 });
 it('clears order and shipment fields after warehouse changes', async () => {
  const state = createShippingState(context as never);
  state.setBarcode('SO-2'); await state.load(); state.setTrackingNumber('T');
  state.onWarehouseChanged();
  expect(state.detail).toBeNull(); expect(state.trackingNumber).toBe('');
 });
});
