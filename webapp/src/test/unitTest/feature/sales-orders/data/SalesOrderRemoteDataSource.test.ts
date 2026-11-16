import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { SalesOrderRemoteDataSource } from '../../../../../core/feature/sales-orders/data/datasource/SalesOrderRemoteDataSource';

function createApi() {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({})
  } as unknown as ApiClient;
}

describe('SalesOrderRemoteDataSource', () => {
  it('serializes only supported sales-order list filters with backend query names', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    await source.list({
      status: 'OPEN,PICKED', warehouseId: 4, page: 2, perPage: 25,
      q: ' SO-8 ', excludePostFulfillment: true, orderType: 'sale',
      hidePrinted: true, includePrimaryBin: true, includeLineCount: true, localPickup: true
    });
    const url = new URL(String(vi.mocked(api.get).mock.calls[0][0]), 'http://localhost');
    expect(url.pathname).toBe('/api/admin/sales-orders');
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      status: 'OPEN,PICKED', warehouse_id: '4', page: '2', per_page: '25',
      q: 'SO-8', exclude_post_fulfillment: 'true', order_type: 'sale',
      hide_printed: 'true', include_primary_bin: 'true',
      include_line_count: 'true', local_pickup: 'true'
    });
  });

  it('uses the detail, create and header update contracts', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    await source.getById(17);
    await source.create({ so_number: 'SO-17', warehouse_id: 2, lines: [{ item_id: 3, quantity_ordered: 4 }] });
    await source.update(17, { priority: 2 });
    expect(api.get).toHaveBeenCalledWith('/api/admin/sales-orders/17');
    expect(api.post).toHaveBeenCalledWith('/api/admin/sales-orders', {
      so_number: 'SO-17', warehouse_id: 2, lines: [{ item_id: 3, quantity_ordered: 4 }]
    });
    expect(api.put).toHaveBeenCalledWith('/api/admin/sales-orders/17', { priority: 2 });
  });

  it('requests recent short-pick events with the backend filters', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    await source.listShortPicks({ days: 14, warehouseId: 6 });
    expect(api.get).toHaveBeenCalledWith('/api/admin/short-picks?days=14&warehouse_id=6');
  });

  it('uses dedicated PATCH contracts for structured addresses and allocation delta', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    const address = { billing_address_line1: '1 Main', shipping_address_city: '' };
    await source.updateAddress(17, address);
    await source.updateAllocation(17, 29, { delta: -2 });
    expect(api.request).toHaveBeenNthCalledWith(1, '/api/admin/sales-orders/17/address', {
      method: 'PATCH', body: address
    });
    expect(api.request).toHaveBeenNthCalledWith(2, '/api/admin/sales-orders/17/lines/29/allocation', {
      method: 'PATCH', body: { delta: -2 }
    });
  });

  it('sends split-bin picks and the explicit shortfall acknowledgement', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    await source.adminPick(17, [
      { soLineId: 29, binId: 3, quantity: 2 },
      { soLineId: 29, binId: 4, quantity: 1 }
    ]);
    await source.adminShip(17, true);
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/admin/sales-orders/17/admin-pick', {
      lines: [
        { so_line_id: 29, bin_id: 3, quantity: 2 },
        { so_line_id: 29, bin_id: 4, quantity: 1 }
      ]
    });
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/admin/sales-orders/17/admin-ship', {
      acknowledge_shortfall: true
    });
  });

  it('maps partial fulfillment, revert, bins, related orders and source-system endpoints', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    await source.partialFulfill(17, { lines: [{ soLineId: 29, shortQuantity: 2 }], reason: 'damaged' });
    await source.revertStatus(17, { newStatus: 'OPEN', releasePickTaskIds: [101] });
    await source.getAvailableBins(17, 29);
    await source.related(17);
    await source.listSourceSystems();
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/admin/sales-orders/17/partial-fulfill', {
      lines: [{ so_line_id: 29, short_qty: 2 }], reason_detail: 'damaged'
    });
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/admin/sales-orders/17/revert-status', {
      new_status: 'OPEN', release_pick_task_ids: [101]
    });
    expect(api.get).toHaveBeenNthCalledWith(1, '/api/admin/sales-orders/17/lines/29/available-bins');
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/admin/sales-orders/17/related');
    expect(api.get).toHaveBeenNthCalledWith(3, '/api/admin/source-systems');
  });
});
