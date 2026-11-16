import { describe, expect, it } from 'vitest';
import { PickingTicketMapper } from '../../../../../core/feature/picking-tickets/data/mapper/PickingTicketMapper';
import type { PickingTicketResponseDto } from '../../../../../core/feature/picking-tickets/data/dto/PickingTicketDto';
const dto: PickingTicketResponseDto = {
  sales_order: {
    so_id: 7, so_number: 'SO-007', customer_name: 'Acme', status: 'OPEN', warehouse_id: 2,
    ship_method: 'Ground', ship_address: 'Legacy address', order_date: null, ship_by_date: '2026-11-20',
    created_at: null, shipping_address_name: 'Receiving', shipping_address_line1: '1 Main',
    shipping_address_line2: null, shipping_address_city: 'Miami', shipping_address_state: 'FL',
    shipping_address_postal_code: '33101', shipping_address_country: 'US'
  },
  lines: [{
    so_line_id: 12, line_number: 1, sku: 'SKU-12', item_name: 'Widget', upc: null,
    quantity_ordered: 4, quantity_shipped: 1, preferred_bin_code: 'A-01'
  }],
  branding: { company_name: 'Acme Co', company_address: 'HQ', logo_url: null, returns_text: null }
};
describe('PickingTicketMapper', () => {
  it('maps header, structured address, line quantities, preferred bin and branding', () => {
    expect(PickingTicketMapper.toTicket(dto)).toEqual({
      order: {
        salesOrderId: 7, salesOrderNumber: 'SO-007', customerName: 'Acme', status: 'OPEN',
        warehouseId: 2, shipMethod: 'Ground', legacyShippingAddress: 'Legacy address',
        orderDate: null, shipByDate: '2026-11-20', createdAt: null,
        shippingAddress: { name: 'Receiving', line1: '1 Main', line2: null, city: 'Miami', state: 'FL', postalCode: '33101', country: 'US' }
      },
      lines: [{
        salesOrderLineId: 12, lineNumber: 1, sku: 'SKU-12', itemName: 'Widget',
        upc: null, quantityOrdered: 4, quantityShipped: 1, preferredBinCode: 'A-01'
      }],
      branding: { logoUrl: null, companyName: 'Acme Co', companyAddress: 'HQ', returnsText: null }
    });
  });
  it('rejects a missing sales order and invalid lines', () => {
    expect(() => PickingTicketMapper.toTicket({ ...dto, sales_order: null })).toThrow(/pedido válido/);
    expect(() => PickingTicketMapper.toTicket({ ...dto, lines: null as never })).toThrow(/líneas/);
  });
  it('accepts a valid ticket with no lines so the UI can render the empty-preparation state', () => {
    const ticket = PickingTicketMapper.toTicket({ ...dto, lines: [] });
    expect(ticket.order.salesOrderId).toBe(7);
    expect(ticket.lines).toEqual([]);
  });
  it('maps a repeated mark-printed response to a successful empty result', () => {
    expect(PickingTicketMapper.toMarked({ marked: [] })).toEqual({ marked: [] });
  });
});
