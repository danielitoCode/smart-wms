import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
const vm = vi.hoisted(() => ({
 barcode: '', detail: null, trackingNumber: '', carrier: '', shipMethod: '', loading: false, busy: false, error: null, lastResult: null, warehouseId: 6,
 setBarcode: vi.fn(), setTrackingNumber: vi.fn(), setCarrier: vi.fn(), setShipMethod: vi.fn(), load: vi.fn(), fulfill: vi.fn(), onWarehouseChanged: vi.fn()
}));
const warehouse = { generation: 1, warehouseId: 6, warehouses: [] };
vi.mock('../../../../../core/feature/shipping/ui/state/shippingState.svelte', () => ({ createShippingState: () => vm }));
import ShippingScreen from '../../../../../core/feature/shipping/ui/screens/ShippingScreen.svelte';

describe('ShippingScreen scanner UI', () => {
 it('shows active warehouse context and fulfillment controls', () => {
  const { body } = render(ShippingScreen, { context: new Map([['i18n', { t: (v: string) => v }], ['warehouseSelection', warehouse]]) });
  expect(body).toContain('Almacén activo: #6');
  expect(body).toContain('Código de seguimiento');
  expect(body).toContain('Transportista');
  expect(body).toContain('Registrar despacho');
 });
});
