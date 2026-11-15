import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
  PurchaseOrderDetailDto, PurchaseOrderDto, PurchaseOrderListDto, PurchaseOrderReceiptsDto
} from '../dto/PurchaseOrderDto';

export class PurchaseOrdersRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    warehouseId?: number | null; search?: string; status?: string; dateFrom?: string;
    dateTo?: string; page?: number; perPage?: number; includeArchived?: boolean;
  } = {}): Promise<PurchaseOrderListDto> {
    const query = new URLSearchParams();
    query.set('page', String(params.page ?? 1));
    query.set('per_page', String(params.perPage ?? 50));
    if (params.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
    if (params.search?.trim()) query.set('q', params.search.trim());
    if (params.status) query.set('status', params.status);
    if (params.dateFrom) query.set('expected_from', params.dateFrom);
    if (params.dateTo) query.set('expected_to', params.dateTo);
    if (params.includeArchived) query.set('include_archived', 'true');
    return this.api.get<PurchaseOrderListDto>(`/api/admin/purchase-orders?${query.toString()}`);
  }

  detail(id: number): Promise<PurchaseOrderDetailDto> {
    return this.api.get<PurchaseOrderDetailDto>(`/api/admin/purchase-orders/${id}`);
  }

  create(body: Record<string, unknown>): Promise<PurchaseOrderDetailDto> {
    return this.api.post<PurchaseOrderDetailDto>('/api/admin/purchase-orders', body);
  }

  async update(id: number, body: Record<string, unknown>): Promise<void> {
    await this.api.put(`/api/admin/purchase-orders/${id}`, body);
  }

  async addLine(id: number, body: Record<string, unknown>): Promise<void> {
    await this.api.post(`/api/admin/purchase-orders/${id}/lines`, body);
  }

  async updateLine(id: number, lineId: number, quantityOrdered: number): Promise<void> {
    await this.api.request(`/api/admin/purchase-orders/${id}/lines/${lineId}`, {
      method: 'PATCH', body: { quantity_ordered: quantityOrdered }
    });
  }

  async deleteLine(id: number, lineId: number): Promise<void> {
    await this.api.delete(`/api/admin/purchase-orders/${id}/lines/${lineId}`);
  }

  async listReceipts(id: number): Promise<PurchaseOrderReceiptsDto> {
    return this.api.get<PurchaseOrderReceiptsDto>(`/api/admin/purchase-orders/${id}/receipts`);
  }

  async close(id: number): Promise<void> {
    await this.api.post(`/api/admin/purchase-orders/${id}/close`);
  }

  async reopen(id: number): Promise<void> {
    await this.api.post(`/api/admin/purchase-orders/${id}/reopen`);
  }
}
