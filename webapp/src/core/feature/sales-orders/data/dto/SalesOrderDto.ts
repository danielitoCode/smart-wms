/**
 * Explicit wire contracts for the admin Sales Orders API.
 *
 * List and detail responses intentionally have separate projections: the
 * list endpoint omits several detail-only fields and does not return lines.
 * Keep these DTOs aligned with api/routes/admin/admin_orders.py and
 * api/schemas/sales_orders.py; do not add an index signature to absorb drift.
 */

export interface SalesOrderAddressDto {
  billing_address_name?: string | null;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_address_city?: string | null;
  billing_address_state?: string | null;
  billing_address_postal_code?: string | null;
  billing_address_country?: string | null;
  billing_address_phone?: string | null;
  shipping_address_name?: string | null;
  shipping_address_line1?: string | null;
  shipping_address_line2?: string | null;
  shipping_address_city?: string | null;
  shipping_address_state?: string | null;
  shipping_address_postal_code?: string | null;
  shipping_address_country?: string | null;
  shipping_address_phone?: string | null;
}

export interface SalesOrderLineDto {
  so_line_id: number;
  line_number: number | null;
  item_id: number;
  sku: string;
  item_name: string;
  upc: string | null;
  quantity_ordered: number;
  quantity_allocated: number;
  quantity_picked: number;
  quantity_packed: number;
  quantity_shipped: number;
  quantity_received: number;
  status: string | null;
}

export interface SalesOrderListItemDto extends SalesOrderDto {
  so_id: number;
  so_number: string;
  so_barcode: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  status: string;
  priority: number;
  warehouse_id: number;
  order_type: string | null;
  parent_so_id: number | null;
  ship_method: string | null;
  ship_address: string | null;
  order_date: string | null;
  ship_by_date: string | null;
  created_at: string | null;
  created_by: string | null;
  carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  shipped_date_local: string | null;
  memo: string | null;
  printed_at: string | null;
  primary_bin_code?: string | null;
  primary_bin_pick_sequence?: number | null;
  line_count?: number;
}

export interface SalesOrderDetailDto extends SalesOrderDto {
  so_id: number;
  so_number: string;
  so_barcode: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  status: string;
  priority: number;
  warehouse_id: number;
  ship_method: string | null;
  ship_address: string | null;
  order_date: string | null;
  ship_by_date: string | null;
  created_at: string | null;
  created_by: string | null;
  picked_at: string | null;
  packed_at: string | null;
  shipped_at: string | null;
  shipped_date_local: string | null;
  order_total: string | number | null;
  customer_shipping_paid: string | number | null;
  memo: string | null;
  source_system: string | null;
  order_origin: string | null;
  carrier: string | null;
  tracking_number: string | null;
  order_type: string | null;
  parent_so_id: number | null;
  parent_so_number: string | null;
  backorder_opened_at: string | null;
  backorder_fulfillable_at: string | null;
  cancellation_reason: string | null;
}

export interface SalesOrderDto extends SalesOrderAddressDto {
  so_id?: number | null;
  so_number?: string | null;
  so_barcode?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  status?: string | null;
  priority?: number | null;
  warehouse_id?: number | null;
  ship_method?: string | null;
  ship_address?: string | null;
  order_date?: string | null;
  ship_by_date?: string | null;
  created_at?: string | null;
  created_by?: string | null;
  picked_at?: string | null;
  packed_at?: string | null;
  shipped_at?: string | null;
  shipped_date_local?: string | null;
  order_total?: string | number | null;
  customer_shipping_paid?: string | number | null;
  memo?: string | null;
  source_system?: string | null;
  order_origin?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  order_type?: string | null;
  parent_so_id?: number | null;
  parent_so_number?: string | null;
  backorder_opened_at?: string | null;
  backorder_fulfillable_at?: string | null;
  cancellation_reason?: string | null;
  printed_at?: string | null;
  primary_bin_code?: string | null;
  primary_bin_pick_sequence?: number | null;
  line_count?: number;
  lines?: SalesOrderLineDto[];
}

export interface SalesOrderPickTaskDto {
  pick_task_id: number;
  so_line_id: number;
  item_id: number;
  sku: string;
  item_name: string;
  bin_id: number;
  bin_code: string;
  quantity_picked: number;
  picked_at: string | null;
  picked_by: string | null;
  status: string;
}

export interface AvailableSalesOrderBinDto {
  bin_id: number;
  bin_code: string;
  zone_name: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  preferred_priority: number | null;
}

export interface AvailableSalesOrderBinsResponseDto {
  warehouse_id: number;
  item_id: number;
  bins: AvailableSalesOrderBinDto[];
}

export interface SalesOrderListResponseDto {
  sales_orders: SalesOrderListItemDto[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface SalesOrderDetailResponseDto {
  sales_order: SalesOrderDetailDto;
  lines: SalesOrderLineDto[];
  pick_tasks: SalesOrderPickTaskDto[];
}

export interface RelatedSalesOrderLineDto {
  so_line_id: number;
  line_number: number | null;
  sku: string;
  item_name: string;
  quantity_ordered: number;
  quantity_shipped: number;
  quantity_received: number;
}

export interface RelatedSalesOrderDto {
  so_id: number;
  so_number: string;
  order_type: string | null;
  status: string;
  warehouse_id: number | null;
  customer_name: string | null;
  parent_so_id: number | null;
  depth: number;
  is_current: boolean;
  is_voided: boolean;
  voided_at: string | null;
  cancellation_reason: string | null;
  created_at: string | null;
  lines: RelatedSalesOrderLineDto[];
}

export interface RelatedSalesOrdersResponseDto {
  so_id: number;
  related_count: number;
  records: RelatedSalesOrderDto[];
}

export interface SalesOrderSourceSystemDto {
  source_system: string;
  kind: string;
}

export interface SalesOrderSourceSystemsResponseDto {
  source_systems: SalesOrderSourceSystemDto[];
}

export interface SalesOrderAllocationResponseDto {
  so_line_id: number;
  quantity_allocated: number;
  unchanged?: boolean;
}

export interface CreateSalesOrderRequestDto {
  so_number: string;
  warehouse_id: number;
  lines: Array<{ item_id: number; quantity_ordered: number; line_number?: number }>;
  so_barcode?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  ship_method?: string | null;
  ship_address?: string | null;
  ship_by_date?: string | null;
  memo?: string | null;
  order_origin?: string | null;
}

export interface UpdateSalesOrderRequestDto {
  so_number?: string | null;
  so_barcode?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_address?: string | null;
  ship_method?: string | null;
  ship_address?: string | null;
  ship_by_date?: string | null;
  priority?: number | null;
  memo?: string | null;
  status?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  shipped_at?: string | null;
  source_system?: string | null;
  order_origin?: string | null;
}

export type UpdateSalesOrderAddressRequestDto = Partial<Record<
  | 'billing_address_name' | 'billing_address_line1' | 'billing_address_line2'
  | 'billing_address_city' | 'billing_address_state' | 'billing_address_postal_code'
  | 'billing_address_country' | 'billing_address_phone'
  | 'shipping_address_name' | 'shipping_address_line1' | 'shipping_address_line2'
  | 'shipping_address_city' | 'shipping_address_state' | 'shipping_address_postal_code'
  | 'shipping_address_country' | 'shipping_address_phone',
  string
>>;
