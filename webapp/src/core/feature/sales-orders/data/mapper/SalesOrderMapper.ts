import type {
  PickTask, RelatedSalesOrder, SalesOrder, SalesOrderLine, SalesOrderPage,
  SalesOrderSummary, SalesOrderAddress
} from '../../domain/entity/SalesOrder';
import type {
  PickTaskDto, RelatedSalesOrderDto, SalesOrderDetailResponseDto, SalesOrderLineDto,
  SalesOrderListResponseDto, SalesOrderSummaryDto
} from '../dto/SalesOrderDto';

function requiredNumber(value: number, field: string): number {
  if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid ${field} returned by sales-orders API`);
  return value;
}

function toAddress(dto: Record<string, string | null>, prefix: 'billing' | 'shipping'): SalesOrderAddress {
  return {
    name: dto[`${prefix}_address_name`],
    line1: dto[`${prefix}_address_line1`],
    line2: dto[`${prefix}_address_line2`],
    city: dto[`${prefix}_address_city`],
    state: dto[`${prefix}_address_state`],
    postalCode: dto[`${prefix}_address_postal_code`],
    country: dto[`${prefix}_address_country`],
    phone: dto[`${prefix}_address_phone`]
  };
}

function toSummary(dto: SalesOrderSummaryDto): SalesOrderSummary {
  return {
    salesOrderId: requiredNumber(dto.so_id, 'sales order id'),
    salesOrderNumber: dto.so_number,
    barcode: dto.so_barcode,
    warehouseId: dto.warehouse_id,
    customerName: dto.customer_name,
    customerPhone: dto.customer_phone,
    customerAddress: dto.customer_address,
    status: dto.status,
    orderType: dto.order_type,
    parentSalesOrderId: dto.parent_so_id,
    shipMethod: dto.ship_method,
    shipByDate: dto.ship_by_date,
    createdAt: dto.created_at,
    createdBy: dto.created_by,
    priority: dto.priority ?? 0,
    memo: dto.memo,
    carrier: dto.carrier,
    trackingNumber: dto.tracking_number
  };
}

function toLine(dto: SalesOrderLineDto, salesOrderId: number): SalesOrderLine {
  return {
    soLineId: requiredNumber(dto.so_line_id, 'sales order line id'),
    salesOrderId,
    itemId: requiredNumber(dto.item_id, 'item id'),
    lineNumber: dto.line_number,
    sku: dto.sku,
    itemName: dto.item_name,
    upc: dto.upc,
    quantityOrdered: dto.quantity_ordered,
    quantityAllocated: dto.quantity_allocated,
    quantityPicked: dto.quantity_picked,
    quantityPacked: dto.quantity_packed,
    quantityShipped: dto.quantity_shipped,
    quantityReceived: dto.quantity_received ?? 0,
    status: dto.status
  };
}

function toPickTask(dto: PickTaskDto): PickTask {
  return {
    pickTaskId: dto.pick_task_id, soLineId: dto.so_line_id, itemId: dto.item_id,
    sku: dto.sku, itemName: dto.item_name, binId: dto.bin_id, binCode: dto.bin_code,
    quantityPicked: dto.quantity_picked, pickedAt: dto.picked_at,
    pickedBy: dto.picked_by, status: dto.status
  };
}

export const SalesOrderMapper = {
  toSummary,
  toPage(dto: SalesOrderListResponseDto): SalesOrderPage {
    if (!Array.isArray(dto.sales_orders)) throw new Error('Invalid sales-orders list returned by API');
    return { items: dto.sales_orders.map(toSummary), total: dto.total, page: dto.page, perPage: dto.per_page, pages: dto.pages };
  },
  toDetail(dto: SalesOrderDetailResponseDto): SalesOrder {
    const base = toSummary(dto.sales_order);
    return {
      ...base,
      customerId: dto.sales_order.customer_id ?? null,
      customerEmail: dto.sales_order.customer_email,
      billingAddress: toAddress(dto.sales_order as unknown as Record<string, string | null>, 'billing'),
      shippingAddress: toAddress(dto.sales_order as unknown as Record<string, string | null>, 'shipping'),
      shipAddress: dto.sales_order.ship_address,
      orderDate: dto.sales_order.order_date,
      orderOrigin: dto.sales_order.order_origin,
      sourceSystem: dto.sales_order.source_system,
      orderTotal: dto.sales_order.order_total,
      customerShippingPaid: dto.sales_order.customer_shipping_paid,
      shippedDateLocal: dto.sales_order.shipped_date_local,
      shippedAt: dto.sales_order.shipped_at,
      parentSalesOrderNumber: dto.sales_order.parent_so_number,
      cancellationReason: dto.sales_order.cancellation_reason,
      lines: dto.lines.map((line) => toLine(line, base.salesOrderId)),
      pickTasks: dto.pick_tasks.map(toPickTask)
    };
  },
  toRelated(dto: RelatedSalesOrderDto[]): RelatedSalesOrder[] {
    return dto.map((row) => ({
      soId: row.so_id, soNumber: row.so_number, status: row.status,
      orderType: row.order_type, parentSoId: row.parent_so_id,
      depth: row.depth, voidedAt: row.voided_at
    }));
  }
};
