import { describe, expect, it } from 'vitest';
import { SalesOrderMapper } from '../../../../../../core/feature/sales-orders/data/mapper/SalesOrderMapper';
import type { SalesOrderDetailResponseDto, SalesOrderListResponseDto } from '../../../../../../core/feature/sales-orders/data/dto/SalesOrderDto';

const summary = {
  so_id: 7, so_number: 'SO-007', so_barcode: null, customer_name: 'Acme',
  customer_phone: null, customer_address: null, status: 'OPEN', priority: 0,
  warehouse_id: 2, order_type: 'sale', parent_so_id: null, ship_method: null,
  ship_address: null, order_date: null, ship_by_date: null, created_at: null,
  created_by: 'admin', carrier: null, tracking_number: null, memo: null
};

describe('SalesOrderMapper', () => {
  it('preserves list pagination and order identity', () => {
    const dto: SalesOrderListResponseDto = {
      sales_orders: [summary], total: 1, page: 1, per_page: 50, pages: 1
    };
    expect(SalesOrderMapper.toPage(dto)).toMatchObject({
      total: 1, page: 1, perPage: 50,
      items: [{ salesOrderId: 7, salesOrderNumber: 'SO-007' }]
    });
  });

  it('maps detail, nullable fields, addresses, lines and pick tasks', () => {
    const dto: SalesOrderDetailResponseDto = {
      sales_order: {
        ...summary, customer_email: null, order_total: '0.00',
        customer_shipping_paid: null, shipped_date_local: null, shipped_at: null,
        source_system: null, order_origin: null, parent_so_number: null,
        cancellation_reason: null,
        billing_address_name: 'Acme', billing_address_line1: '1 Main',
        billing_address_line2: null, billing_address_city: 'Havana',
        billing_address_state: null, billing_address_postal_code: null,
        billing_address_country: 'Cuba', billing_address_phone: null,
        shipping_address_name: null, shipping_address_line1: null,
        shipping_address_line2: null, shipping_address_city: null,
        shipping_address_state: null, shipping_address_postal_code: null,
        shipping_address_country: null, shipping_address_phone: null
      },
      lines: [{
        so_line_id: 9, line_number: 1, item_id: 3, sku: 'SKU-3', item_name: 'Item',
        upc: null, quantity_ordered: 5, quantity_allocated: 2, quantity_picked: 1,
        quantity_packed: 0, quantity_shipped: 0, quantity_received: 0, status: 'PENDING'
      }],
      pick_tasks: [{
        pick_task_id: 11, so_line_id: 9, item_id: 3, sku: 'SKU-3',
        item_name: 'Item', bin_id: 4, bin_code: 'A-01', quantity_picked: 1,
        picked_at: null, picked_by: null, status: 'PICKED'
      }]
    };
    const order = SalesOrderMapper.toDetail(dto);
    expect(order.customerId).toBeNull();
    expect(order.billingAddress).toMatchObject({ name: 'Acme', line1: '1 Main', city: 'Havana' });
    expect(order.lines[0]).toMatchObject({
      soLineId: 9, lineNumber: 1, itemId: 3, quantityOrdered: 5, quantityAllocated: 2
    });
    expect(order.pickTasks[0]).toMatchObject({ pickTaskId: 11, binCode: 'A-01' });
  });

  it('maps the complete related-order record shape', () => {
    expect(SalesOrderMapper.toRelated([{
      so_id: 7, so_number: 'SO-007', status: 'OPEN', order_type: 'sale',
      warehouse_id: 2, customer_name: 'Acme', parent_so_id: null,
      depth: 0, is_current: true, is_voided: false, voided_at: null,
      cancellation_reason: null, created_at: null, lines: []
    }])).toEqual([{
      soId: 7, soNumber: 'SO-007', status: 'OPEN', orderType: 'sale',
      warehouseId: 2, customerName: 'Acme', parentSoId: null, depth: 0,
      isCurrent: true, isVoided: false, voidedAt: null,
      cancellationReason: null, createdAt: null, lines: []
    }]);
  });
});
