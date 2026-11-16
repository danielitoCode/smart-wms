import type { ApiClient } from '#core/infrastructure/api/ApiClient.ts';
import type {
  SalesOrderDetailResponseDto, SalesOrderListResponseDto,
  RelatedSalesOrdersResponseDto, AvailableSalesOrderBinsResponseDto,
  SalesOrderAllocationResponseDto, SalesOrderSourceSystemsResponseDto,
  AdminShipResponseDto, CreateSalesOrderRequestDto, UpdateSalesOrderRequestDto,
  UpdateSalesOrderAddressRequestDto, AddSalesOrderLineRequestDto,
  UpdateSalesOrderLineRequestDto, AdminPickRequestDto, PartialFulfillRequestDto,
  RevertSalesOrderStatusRequestDto, AdminShipRequestDto, CreateRmaRequestDto,
  ReceiveRmaRequestDto
} from '../dto/SalesOrderDto';
import type { UpdateSalesOrderAllocationInput } from '../../domain/entity/SalesOrder';

export class SalesOrderRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  async list(params?: {
    status?: string; warehouseId?: number; page?: number; perPage?: number;
    q?: string; excludePostFulfillment?: boolean; orderType?: string;
    hidePrinted?: boolean; includePrimaryBin?: boolean; includeLineCount?: boolean;
    localPickup?: boolean;
  }): Promise<SalesOrderListResponseDto> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.warehouseId != null) query.set('warehouse_id', String(params.warehouseId));
    if (params?.page != null) query.set('page', String(params.page));
    if (params?.perPage != null) query.set('per_page', String(params.perPage));
    if (params?.q?.trim()) query.set('q', params.q.trim());
    if (params?.excludePostFulfillment) query.set('exclude_post_fulfillment', 'true');
    if (params?.orderType) query.set('order_type', params.orderType);
    if (params?.hidePrinted) query.set('hide_printed', 'true');
    if (params?.includePrimaryBin) query.set('include_primary_bin', 'true');
    if (params?.includeLineCount) query.set('include_line_count', 'true');
    if (params?.localPickup) query.set('local_pickup', 'true');
    const qs = query.toString();
    return this.api.get<SalesOrderListResponseDto>(
      `/api/admin/sales-orders${qs ? `?${qs}` : ''}`
    );
  }

  async getById(id: number): Promise<SalesOrderDetailResponseDto> {
    return this.api.get<SalesOrderDetailResponseDto>(`/api/admin/sales-orders/${id}`);
  }
  async create(payload: CreateSalesOrderRequestDto): Promise<SalesOrderDetailResponseDto> {
    return this.api.post<SalesOrderDetailResponseDto>('/api/admin/sales-orders', payload);
  }
  async update(id: number, payload: UpdateSalesOrderRequestDto): Promise<void> {
    await this.api.put(`/api/admin/sales-orders/${id}`, payload);
  }
  async updateAddress(id: number, payload: UpdateSalesOrderAddressRequestDto): Promise<void> {
    await this.api.request(`/api/admin/sales-orders/${id}/address`, {
      method: 'PATCH',
      body: payload
    });
  }
  async updateAllocation(id: number, lineId: number, input: UpdateSalesOrderAllocationInput): Promise<SalesOrderAllocationResponseDto> {
    return this.api.request<SalesOrderAllocationResponseDto>(
      `/api/admin/sales-orders/${id}/lines/${lineId}/allocation`,
      { method: 'PATCH', body: { delta: input.delta } }
    );
  }

  async listSourceSystems(): Promise<SalesOrderSourceSystemsResponseDto> {
    return this.api.get<SalesOrderSourceSystemsResponseDto>('/api/admin/source-systems');
  }

  async cancel(id: number): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/cancel`);
  }
  async addLine(id: number, payload: AddSalesOrderLineRequestDto): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/lines`, payload);
  }
  async updateLine(id: number, lineId: number, payload: UpdateSalesOrderLineRequestDto): Promise<void> {
    await this.api.request(`/api/admin/sales-orders/${id}/lines/${lineId}`, {
      method: 'PATCH', body: payload
    });
  }
  async deleteLine(id: number, lineId: number): Promise<void> {
    await this.api.delete(`/api/admin/sales-orders/${id}/lines/${lineId}`);
  }
  async adminShip(id: number, payload: AdminShipRequestDto): Promise<AdminShipResponseDto> {
    return this.api.post<AdminShipResponseDto>(`/api/admin/sales-orders/${id}/admin-ship`, payload);
  }
  async getAvailableBins(id: number, lineId: number): Promise<AvailableSalesOrderBinsResponseDto> {
    return this.api.get<AvailableSalesOrderBinsResponseDto>(
      `/api/admin/sales-orders/${id}/lines/${lineId}/available-bins`
    );
  }

  async adminPick(id: number, payload: AdminPickRequestDto): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/admin-pick`, payload);
  }
  async partialFulfill(id: number, payload: PartialFulfillRequestDto): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/partial-fulfill`, payload);
  }
  async revertStatus(id: number, payload: RevertSalesOrderStatusRequestDto): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/revert-status`, payload);
  }
  async related(id: number): Promise<RelatedSalesOrdersResponseDto> {
    return this.api.get(`/api/admin/sales-orders/${id}/related`);
  }
  async createRma(id: number, payload: CreateRmaRequestDto): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/create-rma`, payload);
  }
  async receiveReturn(id: number, payload: ReceiveRmaRequestDto): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/receive-return`, payload);
  }
  async voidReturn(id: number): Promise<void> {
    await this.api.post(`/api/admin/sales-orders/${id}/void-return`);
  }
}
