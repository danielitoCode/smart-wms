import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { PackingRemoteDataSource } from '../../../../../core/feature/packing/data/datasource/PackingRemoteDataSource';

describe('PackingRemoteDataSource', () => {
 const api = { get: vi.fn(), post: vi.fn() } as unknown as ApiClient;
 beforeEach(() => vi.clearAllMocks());
 it('scopes barcode lookup to the active warehouse and encodes the barcode', async () => {
  await new PackingRemoteDataSource(api).loadOrder('SO / 7', 7);
  expect(api.get).toHaveBeenCalledWith('/api/packing/order/SO%20%2F%207?warehouse_id=7');
 });
 it('sends verify and complete payloads using the declared Flask schema', async () => {
  const ds = new PackingRemoteDataSource(api);
  await ds.verify({ soId: 7, warehouseId: 7, scannedBarcode: 'UPC-7', quantity: 2 });
  await ds.complete(7, 7);
  expect(api.post).toHaveBeenNthCalledWith(1, '/api/packing/verify', { so_id: 7, warehouse_id: 7, scanned_barcode: 'UPC-7', quantity: 2 });
  expect(api.post).toHaveBeenNthCalledWith(2, '/api/packing/complete', { so_id: 7, warehouse_id: 7 });
 });
});
