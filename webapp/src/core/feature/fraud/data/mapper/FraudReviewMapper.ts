import type { FraudReview } from '../../domain/entity/FraudReview';
import type { FraudReviewDto } from '../dto/FraudReviewDto';

export const FraudReviewMapper = {
  toDomain(dto: FraudReviewDto): FraudReview {
    return {
      salesOrderId: dto.so_id,
      salesOrderNumber: dto.so_number,
      status: dto.status,
      orderType: dto.order_type,
      orderSource: dto.order_source,
      orderOrigin: dto.order_origin,
      warehouseId: dto.warehouse_id,
      customerName: dto.customer_name,
      customerPhone: dto.customer_phone,
      memo: dto.memo,
      createdAt: dto.created_at,
      billingAddressLine1: dto.billing_address_line1 ?? null,
      billingAddressLine2: dto.billing_address_line2 ?? null,
      billingAddressCity: dto.billing_address_city ?? null,
      billingAddressState: dto.billing_address_state ?? null,
      billingAddressPostalCode: dto.billing_address_postal_code ?? null,
      shippingAddressLine1: dto.shipping_address_line1 ?? null,
      shippingAddressLine2: dto.shipping_address_line2 ?? null,
      shippingAddressCity: dto.shipping_address_city ?? null,
      shippingAddressState: dto.shipping_address_state ?? null,
      shippingAddressPostalCode: dto.shipping_address_postal_code ?? null
    };
  }
};
