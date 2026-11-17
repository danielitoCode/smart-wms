import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
const vm = vi.hoisted(() => ({
 barcode: '', detail: { salesOrder: { soId: 3, soNumber: 'SO-3', status: 'PICKED', warehouseId: 7 }, lines: [], calculatedWeightLbs: 0, totalItems: 0, itemsVerified: 0 }, scannedBarcode: '', quantity: 1, loading: false, busy: false, error: null, info: null, warehouseId: 7,
 setBarcode: vi.fn(), setScannedBarcode: vi.fn(), setQuantity: vi.fn(), load: vi.fn(), verify: vi.fn(), complete: vi.fn(), onWarehouseChanged: vi.fn()
}));
const warehouse = { generation: 1, warehouseId: 7, warehouses: [] };
vi.mock('../../../../../core/feature/packing/ui/state/packingState.svelte', () => ({ createPackingState: () => vm }));
import PackingScreen from '../../../../../core/feature/packing/ui/screens/PackingScreen.svelte';

describe('PackingScreen scanner UI', () => {
 it('shows the active warehouse and disables lookup without a warehouse', () => {
  const { body } = render(PackingScreen, { context: new Map([['i18n', { t: (v: string) => v }], ['warehouseSelection', warehouse]]) });
  expect(body).toContain('Almacén activo: #7');
  expect(body).toContain('Código de barras a verificar');
  expect(body).toContain('Completar empaque');
 });
});
