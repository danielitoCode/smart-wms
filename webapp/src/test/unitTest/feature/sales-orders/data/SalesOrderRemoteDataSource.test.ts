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
    await source.adminPick(17, { lines: [
      { so_line_id: 29, bin_id: 3, quantity: 2 },
      { so_line_id: 29, bin_id: 4, quantity: 1 }
    ] });
    await source.adminShip(17, { acknowledge_shortfall: true });
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

  it('covers cancellation, line CRUD and return-management routes', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);

    await source.cancel(17);
    await source.addLine(17, { item_id: 3, quantity_ordered: 2 });
    await source.updateLine(17, 29, { quantity_ordered: 4 });
    await source.deleteLine(17, 29);
    await source.createRma(17, {
      lines: [{ item_id: 3, quantity: 1, original_so_line_id: 29 }],
      memo: 'damaged'
    });
    await source.receiveReturn(18, {
      item_id: 3, quantity: 1, warehouse_id: 2, bin_id: 8,
      notes: 'checked', idempotency_key: 'receive-uuid'
    });
    await source.voidReturn(18);

    expect(api.post).toHaveBeenNthCalledWith(1, '/api/admin/sales-orders/17/cancel');
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/admin/sales-orders/17/lines', {
      item_id: 3, quantity_ordered: 2
    });
    expect(api.request).toHaveBeenCalledWith('/api/admin/sales-orders/17/lines/29', {
      method: 'PATCH', body: { quantity_ordered: 4 }
    });
    expect(api.delete).toHaveBeenCalledWith('/api/admin/sales-orders/17/lines/29');
    expect(api.post).toHaveBeenNthCalledWith(3, '/api/admin/sales-orders/17/create-rma', {
      lines: [{ item_id: 3, quantity: 1, original_so_line_id: 29 }], memo: 'damaged'
    });
    expect(api.post).toHaveBeenNthCalledWith(4, '/api/admin/sales-orders/18/receive-return', {
      item_id: 3, quantity: 1, warehouse_id: 2, bin_id: 8,
      notes: 'checked', idempotency_key: 'receive-uuid'
    });
    expect(api.post).toHaveBeenNthCalledWith(5, '/api/admin/sales-orders/18/void-return');
  });

  it('maps partial fulfillment, revert, bins, related orders and source-system endpoints', async () => {
    const api = createApi();
    const source = new SalesOrderRemoteDataSource(api);
    await source.partialFulfill(17, { lines: [{ so_line_id: 29, short_qty: 2 }], reason_detail: 'damaged' });
    await source.revertStatus(17, { new_status: 'OPEN', release_pick_task_ids: [101] });
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


describe('Sales order RMA contracts', () => {
  it('sends authorization to create-rma with original-line references', async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const source = new SalesOrderRemoteDataSource({ post } as unknown as ApiClient);
    const payload = {
      lines: [{ item_id: 10, quantity: 2, original_so_line_id: 100 }],
      memo: 'Producto dañado'
    };

    await source.createRma(12, payload);
    expect(post).toHaveBeenCalledWith('/api/admin/sales-orders/12/create-rma', payload);
  });

  it('sends physical receipt to receive-return through its independent DTO', async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const source = new SalesOrderRemoteDataSource({ post } as unknown as ApiClient);
    const payload = {
      item_id: 10, quantity: 1, warehouse_id: 2, bin_id: 20,
      notes: 'Caja abierta', idempotency_key: 'receive-1'
    };

    await source.receiveReturn(55, payload);
    expect(post).toHaveBeenCalledWith('/api/admin/sales-orders/55/receive-return', payload);
  });
});
