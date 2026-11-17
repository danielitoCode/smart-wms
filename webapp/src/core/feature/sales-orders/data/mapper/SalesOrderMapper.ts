import type {
  RelatedSalesOrder, SalesOrder, SalesOrderAddress, SalesOrderLine,
  SalesOrderPage, SalesOrderPickTask
} from '../../domain/entity/SalesOrder';
import type {
  RelatedSalesOrderDto, SalesOrderDetailResponseDto, SalesOrderProjectionDto,
  SalesOrderLineDto, SalesOrderListResponseDto, SalesOrderPickTaskDto
} from '../dto/SalesOrderDto';

function numberOrNull(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toAddress(dto: SalesOrderProjectionDto, prefix: 'billing' | 'shipping'): SalesOrderAddress {
  const fields = prefix === 'billing'
    ? {
        name: dto.billing_address_name,
        line1: dto.billing_address_line1,
        line2: dto.billing_address_line2,
        city: dto.billing_address_city,
        state: dto.billing_address_state,
        postalCode: dto.billing_address_postal_code,
        country: dto.billing_address_country,
        phone: dto.billing_address_phone
      }
    : {
        name: dto.shipping_address_name,
        line1: dto.shipping_address_line1,
        line2: dto.shipping_address_line2,
        city: dto.shipping_address_city,
        state: dto.shipping_address_state,
        postalCode: dto.shipping_address_postal_code,
        country: dto.shipping_address_country,
        phone: dto.shipping_address_phone
      };

  const normalize = (value: string | null | undefined): string | null =>
    value == null || value === '' ? null : value;

  return {
    name: normalize(fields.name),
    line1: normalize(fields.line1),
    line2: normalize(fields.line2),
    city: normalize(fields.city),
    state: normalize(fields.state),
    postalCode: normalize(fields.postalCode),
    country: normalize(fields.country),
    phone: normalize(fields.phone)
  };
}

function toLine(dto: SalesOrderLineDto): SalesOrderLine {
  const lineId = dto.so_line_id;
  if (lineId == null || !Number.isInteger(lineId) || lineId < 1) {
    throw new Error('La respuesta del pedido contiene una línea sin so_line_id válido');
  }
  return {
    soLineId: lineId, lineId,
    lineNumber: dto.line_number, itemId: dto.item_id,
    sku: dto.sku ?? '', itemName: dto.item_name ?? '', upc: dto.upc ?? null,
    quantityOrdered: dto.quantity_ordered,
    quantityAllocated: dto.quantity_allocated,
    quantityPicked: dto.quantity_picked,
    quantityPacked: dto.quantity_packed,
    quantityShipped: dto.quantity_shipped,
    quantityReceived: dto.quantity_received,
    status: dto.status
  };
}

function toPickTask(dto: SalesOrderPickTaskDto): SalesOrderPickTask {
  return {
    pickTaskId: dto.pick_task_id, soLineId: dto.so_line_id, itemId: dto.item_id,
    sku: dto.sku, itemName: dto.item_name, binId: dto.bin_id, binCode: dto.bin_code,
    quantityPicked: dto.quantity_picked, pickedAt: dto.picked_at,
    pickedBy: dto.picked_by, status: dto.status
  };
}

function toDomain(dto: SalesOrderProjectionDto): SalesOrder {
  const id = dto.so_id;
  if (id == null || !Number.isInteger(id) || id < 1) {
    throw new Error('La respuesta del pedido no contiene un so_id válido');
  }
  const number = dto.so_number ?? '';
  return {
    salesOrderId: id, salesOrderNumber: number, soNumber: number, id,
    barcode: dto.so_barcode ?? null,
    status: dto.status ?? 'OPEN', priority: dto.priority ?? 0,
    warehouseId: dto.warehouse_id ?? null, customerId: null,
    customerName: dto.customer_name ?? null, customerEmail: dto.customer_email ?? null,
    customerPhone: dto.customer_phone ?? null, customerAddress: dto.customer_address ?? null,
    shipAddress: dto.ship_address ?? null, shipMethod: dto.ship_method ?? null,
    shipByDate: dto.ship_by_date ?? null, orderType: dto.order_type ?? null,
    orderOrigin: dto.order_origin ?? null, parentSalesOrderNumber: dto.parent_so_number ?? null,
    parentSoId: dto.parent_so_id ?? null, parentSoNumber: dto.parent_so_number ?? null,
    carrier: dto.carrier ?? null, trackingNumber: dto.tracking_number ?? null,
    memo: dto.memo ?? null, orderTotal: numberOrNull(dto.order_total),
    customerShippingPaid: numberOrNull(dto.customer_shipping_paid),
    sourceSystem: dto.source_system ?? null, cancellationReason: dto.cancellation_reason ?? null,
    backorderOpenedAt: dto.backorder_opened_at ?? null,
    backorderFulfillableAt: dto.backorder_fulfillable_at ?? null,
    createdAt: dto.created_at ?? null, printedAt: dto.printed_at ?? null,
    primaryBinCode: dto.primary_bin_code ?? null,
    primaryBinPickSequence: dto.primary_bin_pick_sequence ?? null,
    lineCount: dto.line_count,
    pickedAt: dto.picked_at ?? null,
    packedAt: dto.packed_at ?? null,
    shippedAt: dto.shipped_at ?? null, shippedDateLocal: dto.shipped_date_local ?? null,
    billingAddress: toAddress(dto, 'billing'), shippingAddress: toAddress(dto, 'shipping'),
    lines: Array.isArray(dto.lines) ? dto.lines.map(toLine) : [], pickTasks: []
  };
}

export const SalesOrderMapper = {
  toDomain,
  toPage(dto: SalesOrderListResponseDto): SalesOrderPage {
    return {
      items: dto.sales_orders.map(toDomain), total: dto.total,
      page: dto.page, perPage: dto.per_page, pages: dto.pages
    };
  },
  toDetail(dto: SalesOrderDetailResponseDto): SalesOrder {
    return {
      ...toDomain(dto.sales_order),
      lines: dto.lines.map(toLine),
      pickTasks: dto.pick_tasks.map(toPickTask)
    };
  },
  toRelated(records: RelatedSalesOrderDto[]): RelatedSalesOrder[] {
    return records.map((record) => ({
      soId: record.so_id, soNumber: record.so_number, status: record.status,
      orderType: record.order_type, warehouseId: record.warehouse_id,
      customerName: record.customer_name, parentSoId: record.parent_so_id,
      depth: record.depth, isCurrent: record.is_current, isVoided: record.is_voided,
      voidedAt: record.voided_at, cancellationReason: record.cancellation_reason,
      createdAt: record.created_at,
      lines: record.lines.map((line) => ({
        soLineId: line.so_line_id, lineNumber: line.line_number,
        sku: line.sku, itemName: line.item_name,
        quantityOrdered: line.quantity_ordered,
        quantityShipped: line.quantity_shipped,
        quantityReceived: line.quantity_received
      }))
    }));
  }
};
