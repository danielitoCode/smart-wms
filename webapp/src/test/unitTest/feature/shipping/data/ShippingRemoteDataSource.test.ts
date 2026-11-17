import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { ShippingRemoteDataSource } from '../../../../../core/feature/shipping/data/datasource/ShippingRemoteDataSource';

describe('ShippingRemoteDataSource', () => {
 const api = { get: vi.fn(), post: vi.fn() } as unknown as ApiClient;
 beforeEach(() => vi.clearAllMocks());
 it('scopes barcode lookup to the active warehouse and encodes the barcode', async () => {
  await new ShippingRemoteDataSource(api).loadOrder('SO / 9', 9);
  expect(api.get).toHaveBeenCalledWith('/api/shipping/order/SO%20%2F%209?warehouse_id=9');
 });
 it('sends fulfillment metadata using the exact Flask contract', async () => {
  await new ShippingRemoteDataSource(api).fulfill({ soId: 9, trackingNumber: 'TRACK-9', carrier: 'Carrier', shipMethod: 'Ground' });
  expect(api.post).toHaveBeenCalledWith('/api/shipping/fulfill', { so_id: 9, tracking_number: 'TRACK-9', carrier: 'Carrier', ship_method: 'Ground' });
 });
 it('omits optional ship_method when blank', async () => {
  await new ShippingRemoteDataSource(api).fulfill({ soId: 9, trackingNumber: 'TRACK-9', carrier: 'Carrier', shipMethod: null });
  expect(api.post).toHaveBeenCalledWith('/api/shipping/fulfill', { so_id: 9, tracking_number: 'TRACK-9', carrier: 'Carrier' });
 });
});
