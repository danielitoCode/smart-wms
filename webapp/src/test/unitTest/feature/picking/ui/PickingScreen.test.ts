import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
const vm = vi.hoisted(() => ({
 batch: null, task: null, scannedBarcode: '', quantityPicked: 1, loading: false, busy: false,
 error: null, info: null, warehouseId: 12, soIdsInput: '', waveResult: null, validateBarcode: '',
 validateResult: null, validatedSoIds: [], batchIdentifiersInput: '', createBatchResult: null,
 refresh: vi.fn(), validateWaveSo: vi.fn(), clearValidated: vi.fn(), createWave: vi.fn(), createBatch: vi.fn(),
 confirm: vi.fn(), shortPick: vi.fn(), completeBatch: vi.fn(), setScannedBarcode: vi.fn(),
 setQuantityPicked: vi.fn(), setSoIdsInput: vi.fn(), setValidateBarcode: vi.fn(), setBatchIdentifiersInput: vi.fn()
}));
const warehouse = { initialized: true, generation: 1, warehouseId: 12, warehouses: [], requireWarehouseId: () => 12 };
vi.mock('../../../../../core/feature/picking/ui/state/pickingState.svelte', () => ({ createPickingState: () => vm }));
import PickingScreen from '../../../../../core/feature/picking/ui/screens/PickingScreen.svelte';

describe('PickingScreen scanner UI', () => {
 it('uses shared warehouse context instead of a manually editable warehouse ID', () => {
  const { body } = render(PickingScreen, { context: new Map([['i18n', { t: (v: string) => v }], ['warehouseSelection', warehouse]]) });
  expect(body).toContain('Almacén activo: #12');
  expect(body).not.toContain('ID de almacén');
  expect(body).toContain('Confirmar recogida');
  expect(body).toContain('Indicar faltante (0)');
 });
});
