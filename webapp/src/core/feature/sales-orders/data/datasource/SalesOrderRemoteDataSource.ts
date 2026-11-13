import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type {
  SalesOrderDetailResponseDto, SalesOrderDto, SalesOrderListResponseDto,
  RelatedSalesOrdersResponseDto
} from '../dto/SalesOrderDto';
import type {
  CreateRmaInput,
  ReceiveReturnInput,
  UpdateSalesOrderAddressInput
} from '../../domain/entity/SalesOrder';

function normalizePage(body: SalesOrderDto[] | SalesOrderListResponseDto | null | undefined): SalesOrderListResponseDto {
  if (Array.isArray(body)) {
    return { sales_orders: body, total: body.length, page: 1, per_page: body.length || 1, pages: 1 };
  }
  if (body && Array.isArray(body.sales_orders)) return body;
  return { sales_orders: [], total: 0, page: 1, per_page: 50, pages: 1 };
}

export class SalesOrderRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(params?: {
    status?: string; warehouseId?: number; page?: number; perPage?: number;
    q?: string; excludePostFulfillment?: boolean;
  }): Promise<SalesOrderListResponseDto> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
    if (params?.page != null) query.set('page', String(params.page));
    if (params?.perPage != null) query.set('per_page', String(params.perPage));
    if (params?.q?.trim()) query.set('q', params.q.trim());
    if (params?.excludePostFulfillment) query.set('exclude_post_fulfillment', 'true');
    const qs = query.toString();
    const body = await this.api.get<SalesOrderDto[] | SalesOrderListResponseDto>(
      `/api/admin/sales-orders${qs ? `?${qs}` : ''}`
    );
    return normalizePage(body);
  }

  async getById(id: number): Promise<SalesOrderDetailResponseDto | SalesOrderDto> {
    return this.api.get<SalesOrderDetailResponseDto | SalesOrderDto>(`/api/admin/sales-orders/${id}`);
  }
  async create(payload: Record<string, unknown>): Promise<SalesOrderDetailResponseDto | SalesOrderDto> {
    return this.api.post<SalesOrderDetailResponseDto | SalesOrderDto>('/api/admin/sales-orders', payload);
  }
  async update(id: number, payload: Record<string, unknown>): Promise<void> {
    await this.api.put(`/api/admin/sales-orders/${id}`, payload);
  }
  async updateAddress(id: number, payload: Record<string, string>): Promise<void> {
    await this.api.request(`/api/admin/sales-orders/${id}/address`, {
      method: 'PATCH',
      body: payload
    });
  }
  async cancel(id: number): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/cancel`);
  }
  async addLine(id: number, payload: { item_id: number; quantity_ordered: number }): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/lines`, payload);
  }
  async updateLine(id: number, lineId: number, quantity: number): Promise<void> {
    await this.api.request(`/api/admin/sales-orders/${id}/lines/${lineId}`, {
      method: 'PATCH', body: { quantity_ordered: quantity }
    });
  }
  async deleteLine(id: number, lineId: number): Promise<void> {
    await this.api.delete(`/api/admin/sales-orders/${id}/lines/${lineId}`);
  }
  async adminShip(id: number): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/admin-ship`);
  }
  async adminPick(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/admin-pick`, {
      lines: lines.map(({ soLineId, binId, quantity }) => ({
        so_line_id: soLineId, bin_id: binId, quantity
      }))
    });
  }
  async partialFulfill(id: number, input: import('../../domain/entity/SalesOrder').PartialFulfillInput): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/partial-fulfill`, {
      lines: input.lines.map(({ soLineId, shortQuantity }) => ({
        so_line_id: soLineId, short_qty: shortQuantity
      })),
      reason_detail: input.reason
    });
  }
  async revertStatus(id: number, input: import('../../domain/entity/SalesOrder').RevertSalesOrderInput): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/revert-status`, {
      new_status: input.newStatus, release_pick_task_ids: input.releasePickTaskIds
    });
  }
  async related(id: number): Promise<RelatedSalesOrdersResponseDto> {
    return this.api.get(`/api/admin/sales-orders/${id}/related`);
  }
  async createRma(id: number, input: CreateRmaInput): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/create-rma`, {
      lines: input.lines.map((line) => ({
        item_id: line.itemId, quantity: line.quantity,
        original_so_line_id: line.originalSoLineId ?? undefined
      })),
      memo: input.reason ?? null
    });
  }
  async receiveReturn(id: number, input: ReceiveReturnInput): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/receive-return`, {
      item_id: input.itemId, quantity: input.quantity,
      warehouse_id: input.warehouseId, bin_id: input.binId,
      notes: input.notes ?? undefined,
      idempotency_key: input.idempotencyKey ?? undefined
    });
  }
  async voidReturn(id: number): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/void-return`);
  }
}
