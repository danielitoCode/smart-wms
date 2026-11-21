import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ReturnListDto, ReturnDetailDto, ReturnReceiptsDto, WarehouseOptionDto, BinOptionDto } from '../dto/ReturnDto';
import type { OriginalSaleHeaderDto, OriginalSaleDetailDto, RelatedSalesOrdersDto, ReturnChildDetailDto, CreateRmaResponseDto } from '../dto/ReturnableOrderDto';

export class ReturnsRemoteDataSource {
  constructor(private api: ApiClient) {}

  async list(q: { status?: string; search?: string } = {}) {
    const p = new URLSearchParams({ order_type: 'return', per_page: '50' });
    if (q.status) p.set('status', q.status);
    if (q.search?.trim()) p.set('q', q.search.trim());
    const r = await this.api.get<ReturnListDto>('/api/admin/sales-orders?' + p);
    return r.sales_orders ?? [];
  }

  async originals(search = ''): Promise<OriginalSaleHeaderDto[]> {
    const p = new URLSearchParams({ order_type: 'sale', status: 'SHIPPED', per_page: '50' });
    if (search.trim()) p.set('q', search.trim());
    const r = await this.api.get<{ sales_orders: OriginalSaleHeaderDto[] }>('/api/admin/sales-orders?' + p);
    return r.sales_orders ?? [];
  }

  async returnableOrder(id: number) {
    const [detail, family] = await Promise.all([
      this.api.get<OriginalSaleDetailDto>('/api/admin/sales-orders/' + id),
      this.api.get<RelatedSalesOrdersDto>('/api/admin/sales-orders/' + id + '/related')
    ]);
    const children = family.records.filter(x => x.order_type === 'return' && !x.is_voided);
    const childDetails = await Promise.all(children.map(x =>
      this.api.get<ReturnChildDetailDto>('/api/admin/sales-orders/' + x.so_id)
    ));
    const authorized = new Map<number, number>();
    for (const child of childDetails) {
      for (const line of child.lines ?? []) {
        if (line.original_so_line_id != null) {
          authorized.set(line.original_so_line_id, (authorized.get(line.original_so_line_id) ?? 0) + line.quantity_ordered);
        }
      }
    }
    return {
      header: detail.sales_order,
      lines: detail.lines.map(line => {
        const quantityAlreadyAuthorized = authorized.get(line.so_line_id) ?? 0;
        const quantityShipped = Math.max(0, line.quantity_shipped ?? 0);
        return {
          originalSalesOrderLineId: line.so_line_id,
          itemId: line.item_id,
          sku: line.sku,
          itemName: line.item_name,
          quantityShipped,
          quantityAlreadyAuthorized,
          quantityRemaining: Math.max(0, quantityShipped - quantityAlreadyAuthorized)
        };
      })
    };
  }

  async createReturn(id: number, value: { lines: { item_id: number; quantity: number; original_so_line_id: number }[]; memo?: string | null }) {
    return this.api.post<CreateRmaResponseDto>('/api/admin/sales-orders/' + id + '/create-rma', value);
  }

  async detail(id: number) { return this.api.get<ReturnDetailDto>('/api/admin/sales-orders/' + id); }
  async receipts(id: number) {
    const r = await this.api.get<ReturnReceiptsDto>('/api/admin/sales-orders/' + id + '/return-receipts');
    return r.receipts ?? [];
  }
  async saveMemo(id: number, memo: string) { await this.api.request('/api/admin/sales-orders/' + id + '/memo', { method: 'PATCH', body: { memo } }); }
  async receive(id: number, v: { item_id: number; quantity: number; warehouse_id: number; bin_id: number; notes?: string | null; idempotency_key: string }) {
    return this.api.post<{ receipt_id: number; status: string; replayed?: boolean }>('/api/admin/sales-orders/' + id + '/receive-return', v);
  }
  async void(id: number) { await this.api.post<unknown>('/api/admin/sales-orders/' + id + '/void-return', {}); }
  async warehouses() { const r = await this.api.get<{ warehouses: WarehouseOptionDto[] }>('/api/admin/warehouses?per_page=500'); return r.warehouses ?? []; }
  async bins(warehouseId: number, query: string) {
    const p = new URLSearchParams({ warehouse_id: String(warehouseId), q: query, per_page: '25' });
    const r = await this.api.get<{ bins: BinOptionDto[] }>('/api/admin/bins?' + p);
    return r.bins ?? [];
  }
}
