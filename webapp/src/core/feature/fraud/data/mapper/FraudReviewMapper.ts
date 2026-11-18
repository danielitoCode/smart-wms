import type { FraudReview, FraudReviewDetail } from '../../domain/entity/FraudReview';
import type { FraudReviewDetailDto, FraudReviewDto } from '../dto/FraudReviewDto';

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
  },

  toDetail(dto: FraudReviewDetailDto): FraudReviewDetail {
    const order = dto.sales_order;
    if (order.status !== 'FRAUD_REVIEW') {
      throw new Error('El pedido ya no está en revisión de fraude');
    }
    return {
      order: FraudReviewMapper.toDomain({
        so_id: order.so_id,
        so_number: order.so_number,
        status: order.status,
        order_type: order.order_type,
        order_source: null,
        order_origin: order.order_origin,
        warehouse_id: order.warehouse_id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        memo: order.memo,
        created_at: order.created_at,
        billing_address_line1: order.billing_address_line1,
        billing_address_line2: order.billing_address_line2,
        billing_address_city: order.billing_address_city,
        billing_address_state: order.billing_address_state,
        billing_address_postal_code: order.billing_address_postal_code,
        shipping_address_line1: order.shipping_address_line1,
        shipping_address_line2: order.shipping_address_line2,
        shipping_address_city: order.shipping_address_city,
        shipping_address_state: order.shipping_address_state,
        shipping_address_postal_code: order.shipping_address_postal_code
      }),
      sourceSystem: order.source_system,
      lines: dto.lines.map((line) => ({
        lineId: line.so_line_id,
        itemId: line.item_id,
        sku: line.sku,
        itemName: line.item_name,
        quantityOrdered: line.quantity_ordered,
        quantityAllocated: line.quantity_allocated,
        quantityPicked: line.quantity_picked,
        quantityPacked: line.quantity_packed,
        quantityShipped: line.quantity_shipped,
        status: line.status
      }))
    };
  }
};
