import type { MarkPrintedResult, PickingTicket } from '../../domain/entity/PickingTicket';
import type { MarkPrintedResponseDto, PickingTicketResponseDto } from '../dto/PickingTicketDto';
export const PickingTicketMapper = {
  toTicket(dto: PickingTicketResponseDto): PickingTicket {
    const so = dto.sales_order;
    if (!so || !Number.isInteger(so.so_id) || so.so_id < 1) throw new Error('El servidor devolvió un ticket sin pedido válido');
    if (!Array.isArray(dto.lines)) throw new Error('El servidor devolvió líneas de ticket no válidas');
    return {
      order: {
        salesOrderId: so.so_id, salesOrderNumber: so.so_number, customerName: so.customer_name,
        status: so.status, warehouseId: so.warehouse_id, shipMethod: so.ship_method,
        legacyShippingAddress: so.ship_address, orderDate: so.order_date, shipByDate: so.ship_by_date,
        createdAt: so.created_at,
        shippingAddress: {
          name: so.shipping_address_name, line1: so.shipping_address_line1, line2: so.shipping_address_line2,
          city: so.shipping_address_city, state: so.shipping_address_state,
          postalCode: so.shipping_address_postal_code, country: so.shipping_address_country
        }
      },
      lines: dto.lines.map((line) => ({
        salesOrderLineId: line.so_line_id, lineNumber: line.line_number, sku: line.sku,
        itemName: line.item_name, upc: line.upc, quantityOrdered: line.quantity_ordered,
        quantityShipped: line.quantity_shipped, preferredBinCode: line.preferred_bin_code
      })),
      branding: {
        logoUrl: dto.branding?.logo_url ?? null, companyName: dto.branding?.company_name ?? null,
        companyAddress: dto.branding?.company_address ?? null, returnsText: dto.branding?.returns_text ?? null
      }
    };
  },
  toMarked(dto: MarkPrintedResponseDto): MarkPrintedResult {
    return { marked: (dto.marked ?? []).map((entry) => ({ salesOrderId: entry.so_id, printedAt: entry.printed_at })) };
  }
};
