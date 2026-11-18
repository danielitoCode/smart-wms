import { describe, expect, it } from 'vitest';
import { FraudReviewMapper } from '../../../../../core/feature/fraud/data/mapper/FraudReviewMapper';
import type { FraudReviewDto } from '../../../../../core/feature/fraud/data/dto/FraudReviewDto';

describe('FraudReviewMapper', () => {
  it('maps the warehouse, fraud status and both address projections', () => {
    const dto: FraudReviewDto = {
      so_id: 12, so_number: 'SO-12', status: 'FRAUD_REVIEW',
      order_type: 'sale', order_source: 'erp', order_origin: 'web',
      warehouse_id: 4, customer_name: 'Customer', customer_phone: null,
      memo: null, created_at: null,
      billing_address_line1: '1 Billing St', billing_address_city: 'Denver',
      shipping_address_line1: '9 Shipping St', shipping_address_city: 'Miami'
    };

    expect(FraudReviewMapper.toDomain(dto)).toMatchObject({
      salesOrderId: 12, warehouseId: 4, status: 'FRAUD_REVIEW',
      billingAddressLine1: '1 Billing St', billingAddressCity: 'Denver',
      shippingAddressLine1: '9 Shipping St', shippingAddressCity: 'Miami'
    });
  });

  it('maps the detailed order lines and rejects an order no longer under fraud review', () => {
    const detail = FraudReviewMapper.toDetail({
      sales_order: {
        so_id: 12, so_number: 'SO-12', status: 'FRAUD_REVIEW', warehouse_id: 4,
        order_type: 'sale', customer_name: 'Customer', customer_phone: null,
        memo: 'reviewed', created_at: null, source_system: 'erp', order_origin: null,
        billing_address_line1: null, billing_address_line2: null, billing_address_city: null,
        billing_address_state: null, billing_address_postal_code: null,
        shipping_address_line1: null, shipping_address_line2: null, shipping_address_city: null,
        shipping_address_state: null, shipping_address_postal_code: null
      },
      lines: [{ so_line_id: 3, item_id: 8, sku: 'SKU-8', item_name: 'Widget',
        quantity_ordered: 5, quantity_allocated: 2, quantity_picked: 1,
        quantity_packed: 0, quantity_shipped: 0, status: 'OPEN' }]
    });
    expect(detail.sourceSystem).toBe('erp');
    expect(detail.lines[0]).toMatchObject({ lineId: 3, itemId: 8, quantityOrdered: 5 });
    expect(() => FraudReviewMapper.toDetail({
      sales_order: { so_id: 12, so_number: 'SO-12', status: 'OPEN', warehouse_id: 4,
        order_type: 'sale', customer_name: null, customer_phone: null, memo: null,
        created_at: null, source_system: null, order_origin: null,
        billing_address_line1: null, billing_address_line2: null, billing_address_city: null,
        billing_address_state: null, billing_address_postal_code: null,
        shipping_address_line1: null, shipping_address_line2: null, shipping_address_city: null,
        shipping_address_state: null, shipping_address_postal_code: null }, lines: []
    })).toThrow('El pedido ya no está en revisión de fraude');
  });

  it('normalizes absent address fields to null', () => {
    const dto: FraudReviewDto = {
      so_id: 12, so_number: 'SO-12', status: 'FRAUD_REVIEW',
      order_type: 'sale', order_source: null, order_origin: null,
      warehouse_id: 4, customer_name: null, customer_phone: null,
      memo: null, created_at: null
    };
    expect(FraudReviewMapper.toDomain(dto).shippingAddressLine1).toBeNull();
  });
});
