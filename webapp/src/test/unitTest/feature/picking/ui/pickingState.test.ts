import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
 getActiveBatch: { execute: vi.fn() }, getNextTask: { execute: vi.fn() },
 waveValidate: { execute: vi.fn() }, waveCreate: { execute: vi.fn() }, createBatch: { execute: vi.fn() },
 confirmPick: { execute: vi.fn() }, shortPick: { execute: vi.fn() },
 completeBatch: vi.fn()
}));
vi.mock('../../../../../core/feature/picking/di/picking.dependencies', () => ({ createPickingDependencies: () => deps }));
import { createPickingState } from '../../../../../core/feature/picking/ui/state/pickingState.svelte';

const warehouse = { warehouseId: 12, initialized: true, generation: 1, requireWarehouseId: () => 12 };
const batch = { active: true, batchId: 4, warehouseId: 12, totalPicks: 2, completedPicks: 0, totalOrders: 1, createdAt: null };

describe('Picking scanner state warehouse context', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  deps.getActiveBatch.execute.mockResolvedValue(batch);
  deps.getNextTask.execute.mockResolvedValue({ pickTaskId: 9, batchId: 4, itemId: 3, sku: 'SKU-3', itemName: 'Item', upc: 'UPC-3', quantityToPick: 2, binId: 2, binCode: 'A-01', status: 'PENDING' });
  deps.waveValidate.execute.mockResolvedValue({ valid: true, soId: 5, soNumber: 'SO-5' });
  deps.waveCreate.execute.mockResolvedValue({ batchId: 4, batchNumber: 'WAVE-4', totalOrders: 1, totalPicks: 2, totalUnits: 5, orders: [{ soId: 5, soNumber: 'SO-5', lineCount: 1 }] });
  deps.createBatch.execute.mockResolvedValue({ batchId: 4, batchNumber: 'BATCH-4', totalOrders: 1, totalItems: 2, tasks: [], orders: [] });
 });
 it('loads only the active batch for the selected warehouse', async () => {
  const state = createPickingState(warehouse as never);
  await state.refresh();
  expect(deps.getActiveBatch.execute).toHaveBeenCalledWith(12);
  expect(state.batch?.warehouseId).toBe(12);
 });
 it('sends wave validation and batch creation with the selected warehouse', async () => {
  const state = createPickingState(warehouse as never);
  state.setValidateBarcode('SO-5');
  await state.validateWaveSo();
  state.setBatchIdentifiersInput('SO-5');
  await state.createBatch();
  expect(deps.waveValidate.execute).toHaveBeenCalledWith('SO-5', 12);
  expect(deps.createBatch.execute).toHaveBeenCalledWith(['SO-5'], 12);
 });
 it('refuses to operate when there is no authorized active warehouse', async () => {
  const noWarehouse = { ...warehouse, requireWarehouseId: () => { throw new Error('No hay almacén activo'); } };
  const state = createPickingState(noWarehouse as never);
  expect(await state.refresh()).toBe(false);
  expect(deps.getActiveBatch.execute).not.toHaveBeenCalled();
 });
 it('creates waves using the selected warehouse and real response fields', async () => {
  const state = createPickingState(warehouse as never);
  state.setSoIdsInput('5');
  expect(await state.createWave()).toBe(true);
  expect(deps.waveCreate.execute).toHaveBeenCalledWith([5], 12);
  expect(state.info).toContain('WAVE-4');
 });

});
