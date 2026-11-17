import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { PickingRemoteDataSource } from '../../../../../core/feature/picking/data/datasource/PickingRemoteDataSource';

describe('PickingRemoteDataSource', () => {
 const api = { get: vi.fn(), post: vi.fn() } as unknown as ApiClient;
 beforeEach(() => vi.clearAllMocks());
 it('queries active batch for the selected warehouse', async () => {
  await new PickingRemoteDataSource(api).getActiveBatch(12);
  expect(api.get).toHaveBeenCalledWith('/api/picking/active-batch?warehouse_id=12');
 });
 it('sends wave and batch creation payloads with the selected warehouse', async () => {
  const ds = new PickingRemoteDataSource(api);
  await ds.waveValidate('SO-12', 12);
  await ds.waveCreate([3, 4], 12);
  await ds.createBatch(['SO-12'], 12);
  expect(api.post).toHaveBeenNthCalledWith(1, '/api/picking/wave-validate', { so_barcode: 'SO-12', warehouse_id: 12 });
  expect(api.post).toHaveBeenNthCalledWith(2, '/api/picking/wave-create', { so_ids: [3, 4], warehouse_id: 12 });
  expect(api.post).toHaveBeenNthCalledWith(3, '/api/picking/create-batch', { so_identifiers: ['SO-12'], warehouse_id: 12 });
 });
 it('posts scanner confirmations, short picks and completion using Flask field names', async () => {
  const ds = new PickingRemoteDataSource(api);
  await ds.confirm({ pickTaskId: 8, warehouseId: 12, scannedBarcode: 'UPC', quantityPicked: 2 });
  await ds.short({ pickTaskId: 8, warehouseId: 12, quantityAvailable: 0 });
  await ds.completeBatch(5, 12);
  expect(api.post).toHaveBeenNthCalledWith(1, '/api/picking/confirm', { pick_task_id: 8, warehouse_id: 12, scanned_barcode: 'UPC', quantity_picked: 2 });
  expect(api.post).toHaveBeenNthCalledWith(2, '/api/picking/short', { pick_task_id: 8, warehouse_id: 12, quantity_available: 0 });
  expect(api.post).toHaveBeenNthCalledWith(3, '/api/picking/complete-batch', { batch_id: 5, warehouse_id: 12 });
 });
});
