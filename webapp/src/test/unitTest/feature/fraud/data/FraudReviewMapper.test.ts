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
