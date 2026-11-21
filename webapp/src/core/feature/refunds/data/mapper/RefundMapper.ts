import type { SalesOrderAddress, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';
import type { Refund, RefundRelatedRecord } from '../../domain/entity/Refund';
import type { RefundHeaderDto, RefundLineDto } from '../dto/RefundDto';

function address(line1: string | null | undefined): SalesOrderAddress {
  return {
    name: null, line1: line1 ?? null, line2: null, city: null,
    state: null, postalCode: null, country: null, phone: null
  };
}

function line(dto: RefundLineDto): SalesOrderLine {
  return {
    soLineId: dto.so_line_id,
    lineId: dto.so_line_id,
    lineNumber: dto.line_number,
    itemId: dto.item_id,
    sku: dto.sku,
    itemName: dto.item_name,
    upc: null,
    quantityOrdered: dto.quantity_ordered,
    quantityAllocated: dto.quantity_allocated ?? 0,
    quantityPicked: dto.quantity_picked ?? 0,
    quantityPacked: dto.quantity_packed ?? 0,
    quantityShipped: dto.quantity_shipped ?? 0,
    quantityReceived: dto.quantity_received ?? 0,
    status: dto.status
  };
}

function status(value: string): 'SHIPPED' | 'CANCELLED' {
  if (value === 'SHIPPED' || value === 'CANCELLED') return value;
  throw new Error(`Estado de reembolso no reconocido: ${value}`);
}

export const RefundMapper = {
  line,
  header(dto: RefundHeaderDto, lines: RefundLineDto[] = [], related: RefundRelatedRecord[] = []): Refund {
    const mappedLines = lines.map(line);
    const signedAmount = dto.order_total == null || !Number.isFinite(Number(dto.order_total))
      ? null : Number(dto.order_total);
    const amountIntegrity = signedAmount === null
      ? 'MISSING'
      : signedAmount >= 0
        ? 'NON_NEGATIVE'
        : mappedLines.some(item => item.quantityOrdered >= 0)
          ? 'LINE_SIGN_MISMATCH'
          : 'VALID';
    return {
      salesOrderId: dto.so_id,
      salesOrderNumber: dto.so_number,
      soNumber: dto.so_number,
      id: dto.so_id,
      barcode: dto.so_barcode ?? null,
      status: status(dto.status),
      priority: dto.priority ?? 0,
      warehouseId: dto.warehouse_id ?? null,
      customerId: null,
      customerName: dto.customer_name,
      customerEmail: dto.customer_email ?? null,
      customerPhone: dto.customer_phone ?? null,
      customerAddress: dto.customer_address ?? null,
      shipAddress: dto.ship_address ?? null,
      shipMethod: dto.ship_method ?? null,
      shipByDate: dto.ship_by_date ?? null,
      orderType: 'refund',
      orderOrigin: dto.order_origin ?? null,
      parentSalesOrderNumber: dto.parent_so_number ?? null,
      parentSalesOrderId: dto.parent_so_id,
      parentSoId: dto.parent_so_id,
      parentSoNumber: dto.parent_so_number ?? null,
      carrier: dto.carrier ?? null,
      trackingNumber: dto.tracking_number ?? null,
      memo: dto.memo ?? null,
      orderTotal: signedAmount === null ? 0 : Math.abs(signedAmount),
      signedAmount,
      amountIntegrity,
      relatedRecords: related,
      customerShippingPaid: null,
      sourceSystem: dto.source_system ?? null,
      cancellationReason: null,
      createdAt: dto.created_at,
      pickedAt: null,
      shippedAt: null,
      shippedDateLocal: null,
      billingAddress: address(dto.customer_address),
      shippingAddress: address(dto.ship_address),
      lines: mappedLines,
      pickTasks: []
    };
  }
};
