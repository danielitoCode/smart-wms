export type SalesOrderLineDto = {
  so_line_id: number; line_number: number; item_id: number;
  sku: string | null; item_name: string | null; upc: string | null;
  quantity_ordered: number; quantity_allocated: number; quantity_picked: number;
  quantity_packed: number; quantity_shipped: number; quantity_received: number;
  status: string;
};

export type PickTaskDto = {
  pick_task_id: number; so_line_id: number; item_id: number;
  sku: string; item_name: string; bin_id: number; bin_code: string;
  quantity_picked: number; picked_at: string | null; picked_by: string | null;
  status: string;
};

export type SalesOrderSummaryDto = {
  so_id: number; so_number: string; so_barcode: string | null;
  customer_name: string | null; customer_phone: string | null;
  customer_address: string | null; status: string; priority: number;
  warehouse_id: number; order_type: string; parent_so_id: number | null;
  ship_method: string | null; ship_address: string | null;
  order_date: string | null; ship_by_date: string | null; created_at: string | null;
  created_by: string | null; carrier: string | null; tracking_number: string | null;
  memo: string | null;
};

export type SalesOrderDto = SalesOrderSummaryDto & {
  customer_email: string | null; customer_id?: string | null;
  order_total: string | null; customer_shipping_paid: string | null;
  shipped_date_local: string | null; shipped_at: string | null;
  source_system: string | null; order_origin: string | null;
  parent_so_number: string | null; cancellation_reason: string | null;
  billing_address_name: string | null; billing_address_line1: string | null;
  billing_address_line2: string | null; billing_address_city: string | null;
  billing_address_state: string | null; billing_address_postal_code: string | null;
  billing_address_country: string | null; billing_address_phone: string | null;
  shipping_address_name: string | null; shipping_address_line1: string | null;
  shipping_address_line2: string | null; shipping_address_city: string | null;
  shipping_address_state: string | null; shipping_address_postal_code: string | null;
  shipping_address_country: string | null; shipping_address_phone: string | null;
};

export type SalesOrderListResponseDto = {
  sales_orders: SalesOrderSummaryDto[];
  total: number; page: number; per_page: number; pages: number;
};

export type SalesOrderDetailResponseDto = {
  sales_order: SalesOrderDto;
  lines: SalesOrderLineDto[];
  pick_tasks: PickTaskDto[];
};

export type RelatedSalesOrderDto = {
  so_id: number; so_number: string; status: string; order_type: string;
  parent_so_id: number | null; depth: number; voided_at: string | null;
};

export type SalesOrderRelatedResponseDto = { so_id: number; related_count: number; records: RelatedSalesOrderDto[] };
export type SalesOrderCreateDto = {
  so_number: string; warehouse_id: number; lines: Array<{ item_id: number; quantity_ordered: number; line_number?: number }>;
  so_barcode?: string | null; customer_name?: string | null; customer_phone?: string | null;
  customer_email?: string | null; customer_address?: string | null; ship_method?: string | null;
  ship_address?: string | null; ship_by_date?: string | null; memo?: string | null;
  order_origin?: string | null;
};
export type SalesOrderUpdateDto = Record<string, string | number | null>;
