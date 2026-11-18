import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../../core/infrastructure/api/ApiClient';
import { AdminOperationsRemoteDataSource } from '../../../../../../core/feature/admin-operations/data/datasource/AdminOperationsRemoteDataSource';

function createDataSource(response: unknown = {}) {
  const get = vi.fn(async (_path: string) => response);
  const api = { get } as unknown as ApiClient;
  return { dataSource: new AdminOperationsRemoteDataSource(api), get };
}

describe('AdminOperationsRemoteDataSource Flask contracts', () => {
  it('sends only tab and warehouse scope to the backorders endpoint', async () => {
    const { dataSource, get } = createDataSource({ backorders: [] });

    await dataSource.list('backorders', {
      tab: 'ready-to-ship',
      warehouseId: 3,
      search: 'ignored',
      page: 4,
      perPage: 20
    });

    const url = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/admin/backorders');
    expect(url.searchParams.get('tab')).toBe('ready-to-ship');
    expect(url.searchParams.get('warehouse_id')).toBe('3');
    expect(url.searchParams.has('q')).toBe(false);
    expect(url.searchParams.has('per_page')).toBe(false);
  });

  it('uses adjustments permission endpoint for count approvals without inventing query filters', async () => {
    const { dataSource, get } = createDataSource({ adjustments: [] });

    await dataSource.list('count-approvals', { warehouseId: 2, search: 'cycle' });

    expect(get.mock.calls[0][0]).toBe('/api/admin/adjustments/pending');
  });

  it('does not send an unsupported warehouse filter to preferred bins', async () => {
    const { dataSource, get } = createDataSource({ preferred_bins: [] });

    await dataSource.list('preferred-bins', { warehouseId: 2, search: 'SKU-1' });

    const url = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(url.pathname).toBe('/api/admin/preferred-bins');
    expect(url.searchParams.get('q')).toBe('SKU-1');
    expect(url.searchParams.has('warehouse_id')).toBe(false);
  });

  it('paginates users but does not send an unsupported search query', async () => {
    const { dataSource, get } = createDataSource({ users: [], total: 0, page: 2, per_page: 25, pages: 0 });

    await dataSource.list('users', { search: 'ada', page: 2, perPage: 25 });

    const url = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('per_page')).toBe('25');
    expect(url.searchParams.has('q')).toBe(false);
  });

  it('uses the POS list filters and loads its independent summary contract', async () => {
    const { dataSource, get } = createDataSource({
      sales_orders: [],
      total: 0,
      page: 1,
      per_page: 50,
      pages: 0
    });

    await dataSource.list('pos-activity', { date: '2026-11-12', status: 'OPEN' });

    expect(get).toHaveBeenCalledTimes(2);
    const listUrl = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(listUrl.pathname).toBe('/api/admin/pos/sales-orders');
    expect(listUrl.searchParams.get('order_type')).toBe('all');
    expect(listUrl.searchParams.get('date')).toBe('2026-11-12');
    expect(listUrl.searchParams.get('status')).toBe('OPEN');
    expect(get.mock.calls[1][0]).toBe('/api/admin/pos/summary?date=2026-11-12');
  });

  it('sends POS channel, terminal and cashier filters supported by Flask', async () => {
    const { dataSource, get } = createDataSource({
      sales_orders: [],
      total: 0,
      page: 1,
      per_page: 50,
      pages: 0
    });

    await dataSource.list('pos-activity', {
      channel: 'phone',
      terminalId: 'TERM-4',
      cashierId: 'operator-2'
    });

    const listUrl = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(listUrl.searchParams.get('channel')).toBe('phone');
    expect(listUrl.searchParams.get('terminal_id')).toBe('TERM-4');
    expect(listUrl.searchParams.get('cashier_id')).toBe('operator-2');
  });

  it('sends only the supported transfer-order header filters', async () => {
    const { dataSource, get } = createDataSource({
      transfer_orders: [],
      total: 0,
      page: 1,
      per_page: 50,
      pages: 0
    });

    await dataSource.list('transfer-orders', {
      sourceWarehouseId: 2,
      destinationWarehouseId: 5,
      status: 'AWAITING_APPROVAL'
    });

    const url = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('source_warehouse_id')).toBe('2');
    expect(url.searchParams.get('destination_warehouse_id')).toBe('5');
    expect(url.searchParams.get('status')).toBe('AWAITING_APPROVAL');
    expect(url.searchParams.has('q')).toBe(false);
  });

  it('sends vendor active filtering with false as a meaningful value', async () => {
    const { dataSource, get } = createDataSource({
      vendors: [],
      total: 0,
      page: 1,
      per_page: 50,
      pages: 0
    });

    await dataSource.list('vendors', { active: false, search: 'retired' });

    const url = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('active')).toBe('false');
    expect(url.searchParams.get('q')).toBe('retired');
  });

  it('sends the purchase-order search, status and warehouse filters', async () => {
    const { dataSource, get } = createDataSource({
      purchase_orders: [],
      total: 0,
      page: 1,
      per_page: 50,
      pages: 0
    });

    await dataSource.list('purchase-orders', {
      warehouseId: 4,
      status: 'PARTIAL',
      search: 'PO-4'
    });

    const url = new URL(get.mock.calls[0][0], 'http://localhost');
    expect(url.searchParams.get('warehouse_id')).toBe('4');
    expect(url.searchParams.get('status')).toBe('PARTIAL');
    expect(url.searchParams.get('q')).toBe('PO-4');
  });


  it('applies the selected warehouse to fraud, return and refund sales-order queries', async () => {
    const response = {
      sales_orders: [],
      total: 0,
      page: 1,
      per_page: 50,
      pages: 0
    };

    const fraud = createDataSource(response);
    await fraud.dataSource.list('fraud', { warehouseId: 3 });
    const fraudUrl = new URL(fraud.get.mock.calls[0][0], 'http://localhost');
    expect(fraudUrl.searchParams.get('warehouse_id')).toBe('3');
    expect(fraudUrl.searchParams.get('status')).toBe('FRAUD_REVIEW');

    const returns = createDataSource(response);
    await returns.dataSource.list('returns', { warehouseId: 4 });
    const returnUrl = new URL(returns.get.mock.calls[0][0], 'http://localhost');
    expect(returnUrl.searchParams.get('warehouse_id')).toBe('4');
    expect(returnUrl.searchParams.get('order_type')).toBe('return');

    const refunds = createDataSource(response);
    await refunds.dataSource.list('refunds', { warehouseId: 5 });
    const refundUrl = new URL(refunds.get.mock.calls[0][0], 'http://localhost');
    expect(refundUrl.searchParams.get('warehouse_id')).toBe('5');
    expect(refundUrl.searchParams.get('order_type')).toBe('refund');
  });

});
