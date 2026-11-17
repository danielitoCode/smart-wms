import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { TransferOrdersRemoteDataSource } from '../../../../../core/feature/transfer-orders/data/datasource/TransferOrdersRemoteDataSource';

function apiMock() {
  return {
    get: vi.fn().mockResolvedValue({ transfer_orders: [], warehouses: [] }),
    post: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue(undefined)
  } as unknown as ApiClient & { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
}

describe('TransferOrdersRemoteDataSource', () => {
  it('sends status, both warehouse filters and pagination to the list contract', async () => {
    const api = apiMock();
    await new TransferOrdersRemoteDataSource(api).list({ status: 'OPEN', sourceWarehouseId: 2, destinationWarehouseId: 4, page: 3, perPage: 50 });
    expect(api.get).toHaveBeenCalledWith('/api/admin/transfer-orders?page=3&per_page=50&status=OPEN&source_warehouse_id=2&destination_warehouse_id=4');
  });

  it('uses the admin warehouse directory and the picker-specific read route', async () => {
    const api = apiMock();
    const remote = new TransferOrdersRemoteDataSource(api);
    await remote.warehouses();
    await remote.pickerDetail(12);
    expect(api.get).toHaveBeenNthCalledWith(1, '/api/admin/warehouses?page=1&per_page=1000');
    expect(api.get).toHaveBeenNthCalledWith(2, '/api/admin/picker/transfer-orders/12');
  });

  it('posts import and starts picking only through the documented admin routes', async () => {
    const api = apiMock();
    const remote = new TransferOrdersRemoteDataSource(api);
    await remote.create({ source_warehouse_code: 'WH-A', destination_warehouse_code: 'WH-B', records: [] });
    await remote.startPicking(12);
    expect(api.post).toHaveBeenNthCalledWith(1, '/api/admin/transfer-orders/import', expect.any(Object));
    expect(api.post).toHaveBeenNthCalledWith(2, '/api/admin/transfer-orders/12/start-picking');
  });

  it('submits picker results through the picker endpoint, not an invented transfer-order action', async () => {
    const api = apiMock();
    await new TransferOrdersRemoteDataSource(api).submitPickerResult(12);
    expect(api.post).toHaveBeenCalledWith('/api/admin/picker/transfer-orders/12/submit');
  });

  it('keeps approval, rejection, short-close, cancel and delete on their dedicated routes', async () => {
    const api = apiMock();
    const remote = new TransferOrdersRemoteDataSource(api);
    await remote.approve(12, 8);
    await remote.reject(12, 8, 'damaged');
    await remote.shortClose(12, 31);
    await remote.cancel(12);
    await remote.remove(12);
    expect(api.post.mock.calls).toEqual([
      ['/api/admin/transfer-orders/12/approvals/8/approve', undefined],
      ['/api/admin/transfer-orders/12/approvals/8/reject', { rejection_reason: 'damaged' }],
      ['/api/admin/transfer-orders/12/lines/31/short-close', undefined],
      ['/api/admin/transfer-orders/12/cancel', undefined]
    ]);
    expect(api.delete).toHaveBeenCalledWith('/api/admin/transfer-orders/12');
  });
});
