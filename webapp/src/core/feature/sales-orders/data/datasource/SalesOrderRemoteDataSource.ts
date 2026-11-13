import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type {
  CreateSalesOrder, CreateRmaInput, PartialFulfillInput, ReceiveReturnInput,
  RevertSalesOrderInput, SalesOrderListQuery, UpdateSalesOrder
} from '../../domain/entity/SalesOrder';
import type {
  SalesOrderCreateDto, SalesOrderDetailResponseDto, SalesOrderListResponseDto,
  SalesOrderRelatedResponseDto, SalesOrderUpdateDto
} from '../dto/SalesOrderDto';

const base = '/api/admin/sales-orders';

export class SalesOrderRemoteDataSource {
  constructor(private readonly api: ApiClient) {}

  list(query: SalesOrderListQuery = {}): Promise<SalesOrderListResponseDto> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      per_page: String(query.perPage ?? 50)
    });
    if (query.search?.trim()) params.set('q', query.search.trim());
    if (query.status && query.status !== 'All') params.set('status', query.status);
    if (query.warehouseId) params.set('warehouse_id', String(query.warehouseId));
    if (query.excludePostFulfillment !== false) params.set('exclude_post_fulfillment', 'true');
    return this.api.get(`${base}?${params.toString()}`);
  }

  detail(id: number): Promise<SalesOrderDetailResponseDto> {
    return this.api.get(`${base}/${id}`);
  }

  async related(id: number): Promise<SalesOrderRelatedResponseDto> {
    return this.api.get<SalesOrderRelatedResponseDto>(`${base}/${id}/related`);
  }

  async create(input: CreateSalesOrder): Promise<SalesOrderDetailResponseDto> {
    const body: SalesOrderCreateDto = {
      so_number: input.salesOrderNumber.trim(),
      warehouse_id: input.warehouseId,
      lines: input.lines.map((line) => ({
        item_id: line.itemId,
        quantity_ordered: line.quantityOrdered,
        line_number: line.lineNumber
      })),
      so_barcode: input.barcode,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_email: input.customerEmail,
      customer_address: input.customerAddress,
      ship_method: input.shipMethod,
      ship_address: input.shipAddress,
      ship_by_date: input.shipByDate,
      memo: input.memo,
      order_origin: input.orderOrigin
    };
    return this.api.post(base, body);
  }

  update(id: number, input: UpdateSalesOrder): Promise<unknown> {
    const body: SalesOrderUpdateDto = {};
    const map: Array<[keyof UpdateSalesOrder, string]> = [
      ['salesOrderNumber', 'so_number'], ['barcode', 'so_barcode'],
      ['customerName', 'customer_name'], ['customerPhone', 'customer_phone'],
      ['customerEmail', 'customer_email'], ['customerAddress', 'customer_address'],
      ['shipMethod', 'ship_method'], ['shipAddress', 'ship_address'],
      ['shipByDate', 'ship_by_date'], ['priority', 'priority'], ['status', 'status'],
      ['carrier', 'carrier'], ['trackingNumber', 'tracking_number'],
      ['shippedAt', 'shipped_at'], ['sourceSystem', 'source_system'],
      ['orderOrigin', 'order_origin'], ['memo', 'memo']
    ];
    for (const [domainKey, wireKey] of map) {
      const value = input[domainKey];
      if (value !== undefined) body[wireKey] = value as string | number | null;
    }
    return this.api.put(`${base}/${id}`, body);
  }

  patchAddress(id: number, address: Record<string, string | null>): Promise<unknown> {
    return this.api.request(`${base}/${id}/address`, { method: 'PATCH', body: address });
  }

  patchMemo(id: number, memo: string | null): Promise<unknown> {
    return this.api.request(`${base}/${id}/memo`, { method: 'PATCH', body: { memo } });
  }

  cancel(id: number): Promise<unknown> {
    return this.api.post(`${base}/${id}/cancel`);
  }

  revertStatus(id: number, input: RevertSalesOrderInput): Promise<unknown> {
    return this.api.post(`${base}/${id}/revert-status`, {
      new_status: input.newStatus,
      release_pick_task_ids: input.releasePickTaskIds
    });
  }

  addLine(id: number, input: { itemId: number; quantityOrdered: number }): Promise<unknown> {
    return this.api.post(`${base}/${id}/lines`, {
      item_id: input.itemId, quantity_ordered: input.quantityOrdered
    });
  }

  updateLine(id: number, lineId: number, quantityOrdered: number): Promise<unknown> {
    return this.api.request(`${base}/${id}/lines/${lineId}`, {
      method: 'PATCH', body: { quantity_ordered: quantityOrdered }
    });
  }

  deleteLine(id: number, lineId: number): Promise<unknown> {
    return this.api.request(`${base}/${id}/lines/${lineId}`, { method: 'DELETE' });
  }

  adminShip(id: number, acknowledgeShortfall = false): Promise<unknown> {
    return this.api.post(`${base}/${id}/admin-ship`, { acknowledge_shortfall: acknowledgeShortfall });
  }

  partialFulfill(id: number, input: PartialFulfillInput): Promise<unknown> {
    return this.api.post(`${base}/${id}/partial-fulfill`, {
      lines: input.lines.map((line) => ({ so_line_id: line.soLineId, short_qty: line.shortQuantity })),
      reason_detail: input.reasonDetail
    });
  }

  adminPick(id: number, lines: Array<{ soLineId: number; binId: number; quantity: number }>): Promise<unknown> {
    return this.api.post(`${base}/${id}/admin-pick`, {
      lines: lines.map((line) => ({ so_line_id: line.soLineId, bin_id: line.binId, quantity: line.quantity }))
    });
  }

  createRma(id: number, input: CreateRmaInput): Promise<unknown> {
    return this.api.post(`${base}/${id}/create-rma`, {
      lines: input.lines.map((line) => ({
        item_id: line.itemId, quantity: line.quantity, original_so_line_id: line.originalSoLineId
      })),
      memo: input.memo
    });
  }

  receiveReturn(id: number, input: ReceiveReturnInput): Promise<unknown> {
    return this.api.post(`${base}/${id}/receive-return`, {
      item_id: input.itemId, quantity: input.quantity, warehouse_id: input.warehouseId,
      bin_id: input.binId, notes: input.notes, idempotency_key: input.idempotencyKey
    });
  }

  voidReturn(id: number): Promise<unknown> {
    return this.api.post(`${base}/${id}/void-return`);
  }

  pushToQueue(id: number): Promise<unknown> {
    return this.api.post(`${base}/${id}/push-to-queue`);
  }
}
