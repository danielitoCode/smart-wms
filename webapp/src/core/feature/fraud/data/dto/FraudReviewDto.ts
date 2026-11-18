export type FraudReviewDto = {
  so_id: number;
  so_number: string;
  status: 'FRAUD_REVIEW';
  order_type: string;
  order_source: string | null;
  order_origin: string | null;
  warehouse_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  memo: string | null;
  created_at: string | null;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_address_city?: string | null;
  billing_address_state?: string | null;
  billing_address_postal_code?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_address_city?: string | null;
  shipping_address_state?: string | null;
  shipping_address_postal_code?: string | null;
};

export type FraudReviewListDto = {
  sales_orders: FraudReviewDto[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
};

export type FraudReviewDetailDto = {
  sales_order: {
    so_id: number;
    so_number: string;
    status: string;
    warehouse_id: number;
    order_type: string;
    customer_name: string | null;
    customer_phone: string | null;
    memo: string | null;
    created_at: string | null;
    source_system: string | null;
    order_origin: string | null;
    billing_address_line1: string | null;
    billing_address_line2: string | null;
    billing_address_city: string | null;
    billing_address_state: string | null;
    billing_address_postal_code: string | null;
    shipping_address_line1: string | null;
    shipping_address_line2: string | null;
    shipping_address_city: string | null;
    shipping_address_state: string | null;
    shipping_address_postal_code: string | null;
  };
  lines: Array<{
    so_line_id: number;
    item_id: number;
    sku: string | null;
    item_name: string;
    quantity_ordered: number;
    quantity_allocated: number;
    quantity_picked: number;
    quantity_packed: number;
    quantity_shipped: number;
    status: string;
  }>;
};
