import type { SalesOrderAddress } from '../../../sales-orders/domain/entity/SalesOrder';
import type { Return, ReturnLine } from '../../domain/entity/Return';
import type { ReturnHeaderDto, ReturnLineDto } from '../dto/ReturnDto';

function address(dto: ReturnHeaderDto, prefix: 'billing' | 'shipping'): SalesOrderAddress {
  const read = (field: string): string | null => {
    const value = dto[`${prefix}_address_${field}` as keyof ReturnHeaderDto];
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

function line(dto: ReturnLineDto): ReturnLine {
  return {
    soLineId: dto.so_line_id,
    lineId: dto.so_line_id,
    lineNumber: dto.line_number,
    itemId: dto.item_id,
    sku: dto.sku,
    itemName: dto.item_name,
    upc: null,
    quantityOrdered: dto.quantity_ordered,
    quantityAllocated: dto.quantity_allocated,
    quantityPicked: dto.quantity_picked,
    quantityPacked: dto.quantity_packed,
    quantityShipped: dto.quantity_shipped,
    quantityReceived: dto.quantity_received,
    status: dto.status as ReturnLine['status'],
    originalSalesOrderLineId: dto.original_so_line_id ?? null
  };
}

export const ReturnMapper = {
  line,
  header(dto: ReturnHeaderDto, lines: ReturnLineDto[] = []): Return {
    return {
      salesOrderId: dto.so_id,
      salesOrderNumber: dto.so_number,
      soNumber: dto.so_number,
      id: dto.so_id,
      barcode: dto.so_barcode,
      status: dto.status as Return['status'],
      priority: dto.priority,
      warehouseId: dto.warehouse_id,
      customerId: null,
      customerName: dto.customer_name,
      customerEmail: dto.customer_email,
      customerPhone: dto.customer_phone,
      customerAddress: dto.customer_address,
      shipAddress: dto.ship_address,
      shipMethod: dto.ship_method,
      shipByDate: dto.ship_by_date,
      orderType: 'return',
      orderOrigin: dto.order_origin,
      parentSalesOrderNumber: null,
      parentSalesOrderId: dto.parent_so_id ?? null,
      parentSoId: dto.parent_so_id,
      parentSoNumber: null,
      carrier: dto.carrier,
      trackingNumber: dto.tracking_number,
      memo: dto.memo,
      orderTotal: dto.order_total === null ? null : Number(dto.order_total),
      customerShippingPaid: null,
      sourceSystem: dto.source_system,
      cancellationReason: null,
      createdAt: dto.created_at,
      pickedAt: null,
      shippedAt: null,
      shippedDateLocal: null,
      billingAddress: address(dto, 'billing'),
      shippingAddress: address(dto, 'shipping'),
      lines: lines.map(line),
      pickTasks: [],
      voidedAt: dto.voided_at ?? null,
      voidedBy: dto.voided_by ?? null
    };
  }
};
