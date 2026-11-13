import type {
  RelatedSalesOrder,
  SalesOrder,
  SalesOrderAddress,
  SalesOrderLine,
  SalesOrderPage,
  SalesOrderPickTask
} from '../../domain/entity/SalesOrder';
import type {
  RelatedSalesOrderDto,
  RelatedSalesOrderLineDto,
  SalesOrderDetailResponseDto,
  SalesOrderDto,
  SalesOrderLineDto,
  SalesOrderListResponseDto,
  SalesOrderPickTaskDto
} from '../dto/SalesOrderDto';

function numberOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toAddress(dto: SalesOrderDto, prefix: 'billing' | 'shipping'): SalesOrderAddress {
  const read = (suffix: string): string | null => {
    const value = dto[`${prefix}_address_${suffix}`];
    return typeof value === 'string' && value.length > 0 ? value : null;
  };

  return {
    name: read('name'),
    line1: read('line1'),
    line2: read('line2'),
    city: read('city'),
    state: read('state'),
    postalCode: read('postal_code'),
    country: read('country'),
    phone: read('phone')
  };
}

function toLine(dto: SalesOrderLineDto, orderId: number): SalesOrderLine {
  const lineId = dto.so_line_id ?? dto.line_id ?? dto.id ?? null;
  return {
    soLineId: lineId ?? 0,
    lineId,
    lineNumber: dto.line_number ?? null,
    itemId: dto.item_id ?? null,
    sku: dto.sku ?? '',
    itemName: dto.item_name ?? '',
    upc: dto.upc ?? null,
    quantityOrdered: Number(dto.quantity_ordered ?? dto.qty_ordered ?? 0),
    quantityAllocated: Number(dto.quantity_allocated ?? 0),
    quantityPicked: Number(dto.quantity_picked ?? 0),
    quantityPacked: Number(dto.quantity_packed ?? 0),
    quantityShipped: Number(dto.quantity_shipped ?? 0),
    quantityReceived: Number(dto.quantity_received ?? 0),
    status: dto.status ?? null
  };
}

function toPickTask(dto: SalesOrderPickTaskDto): SalesOrderPickTask {
  return {
    pickTaskId: dto.pick_task_id,
    soLineId: dto.so_line_id,
    itemId: dto.item_id,
    sku: dto.sku,
    itemName: dto.item_name,
    binId: dto.bin_id,
    binCode: dto.bin_code,
    quantityPicked: dto.quantity_picked,
    pickedAt: dto.picked_at,
    pickedBy: dto.picked_by,
    status: dto.status
  };
}

export const SalesOrderMapper = {
  toDomain(dto: SalesOrderDto): SalesOrder {
    const id = dto.so_id ?? dto.id ?? 0;
    const number = dto.so_number ?? '';
    return {
      salesOrderId: id,
      salesOrderNumber: number,
      soNumber: number,
      id,
      barcode: dto.so_barcode ?? dto.barcode ?? null,
      status: dto.status ?? 'OPEN',
      priority: dto.priority ?? 0,
      warehouseId: dto.warehouse_id ?? null,
      customerId: dto.customer_id ?? null,
      customerName: dto.customer_name ?? null,
      customerEmail: dto.customer_email ?? null,
      customerPhone: dto.customer_phone ?? null,
      customerAddress: dto.customer_address ?? null,
      shipAddress: dto.ship_address ?? null,
      shipMethod: dto.ship_method ?? null,
      shipByDate: dto.ship_by_date ?? null,
      orderType: dto.order_type ?? null,
      orderOrigin: dto.order_origin ?? null,
      parentSalesOrderNumber: dto.parent_so_number ?? null,
      parentSoId: dto.parent_so_id ?? null,
      parentSoNumber: dto.parent_so_number ?? null,
      carrier: dto.carrier ?? null,
      trackingNumber: dto.tracking_number ?? null,
      memo: dto.memo ?? null,
      orderTotal: numberOrNull(dto.order_total),
      customerShippingPaid: numberOrNull(dto.customer_shipping_paid),
      sourceSystem: dto.source_system ?? null,
      cancellationReason: dto.cancellation_reason ?? null,
      createdAt: dto.created_at ?? null,
      pickedAt: dto.picked_at ?? null,
      shippedAt: dto.shipped_at ?? null,
      shippedDateLocal: dto.shipped_date_local ?? null,
      billingAddress: toAddress(dto, 'billing'),
      shippingAddress: toAddress(dto, 'shipping'),
      lines: Array.isArray(dto.lines) ? dto.lines.map((line) => toLine(line, id)) : [],
      pickTasks: []
    };
  },

  toPage(dto: SalesOrderListResponseDto): SalesOrderPage {
    return {
      items: dto.sales_orders.map((order) => this.toDomain(order)),
      total: dto.total,
      page: dto.page,
      perPage: dto.per_page,
      pages: dto.pages
    };
  },

  toDetail(dto: SalesOrderDetailResponseDto): SalesOrder {
    const order = this.toDomain(dto.sales_order);
    return {
      ...order,
      lines: dto.lines.map((line) => toLine(line, order.salesOrderId)),
      pickTasks: dto.pick_tasks.map(toPickTask)
    };
  },

  toRelated(records: RelatedSalesOrderDto[]): RelatedSalesOrder[] {
    return records.map((record) => ({
      soId: record.so_id,
      soNumber: record.so_number,
      status: record.status,
      orderType: record.order_type,
      warehouseId: record.warehouse_id,
      customerName: record.customer_name,
      parentSoId: record.parent_so_id,
      depth: record.depth,
      isCurrent: record.is_current,
      isVoided: record.is_voided,
      voidedAt: record.voided_at,
      cancellationReason: record.cancellation_reason,
      createdAt: record.created_at,
      lines: record.lines.map((line: RelatedSalesOrderLineDto) => ({
        soLineId: line.so_line_id,
        lineNumber: line.line_number,
        sku: line.sku,
        itemName: line.item_name,
        quantityOrdered: line.quantity_ordered,
        quantityShipped: line.quantity_shipped,
        quantityReceived: line.quantity_received
      }))
    }))
  }
};
