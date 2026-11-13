import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/infrastructure/api/ApiClient';
import { AdminOperationsRemoteDataSource } from '../../core/feature/admin-operations/data/datasource/AdminOperationsRemoteDataSource';
import { AdminOperationsRepositoryImpl } from '../../core/feature/admin-operations/data/repository/AdminOperationsRepositoryImpl';
import { ListAdminOperationUseCase } from '../../core/feature/admin-operations/domain/usecase/ListAdminOperationUseCase';

afterEach(() => vi.unstubAllGlobals());

describe('Admin operations read flow integration', () => {
  it('connects Flask response, datasource, mapper, repository and use case', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      backorders: [{
        so_id: 12,
        so_number: 'SO-12',
        parent_so_number: null,
        warehouse_id: 3,
        status: 'WAITING_STOCK',
        customer_name: 'Ada',
        items: [{
          sku: 'SKU-1',
          item_name: 'Widget',
          qty: 4,
          open_po: {
            po_number: 'PO-8',
            expected_date: '2026-11-20',
            quantity_remaining: 6
          }
        }],
        days_waiting: 3,
        backorder_opened_at: null,
        fulfillable_since: null
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const api = new ApiClient('https://wms.test');
    const remote = new AdminOperationsRemoteDataSource(api);
    const repository = new AdminOperationsRepositoryImpl(remote);
    const useCase = new ListAdminOperationUseCase(repository);

    const result = await useCase.execute('backorders', {
      warehouseId: 3,
      tab: 'waiting'
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://wms.test/api/admin/backorders?tab=waiting&warehouse_id=3',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
    expect(result).toMatchObject({
      feature: 'backorders',
      rows: [{
        id: 12,
        data: {
          salesOrderNumber: 'SO-12',
          items: [{
            sku: 'SKU-1',
            quantity: 4,
            openPurchaseOrder: {
              number: 'PO-8',
              quantityRemaining: 6
            }
          }]
        }
      }],
      summary: null,
      pagination: null
    });
  });
});
