export interface SalesOrderLineDto {
  so_line_id?: number | null;
  line_id?: number | null;
  id?: number | null;
  line_number?: number | null;
  item_id?: number | null;
  sku?: string | null;
  item_name?: string | null;
  upc?: string | null;
  quantity_ordered?: number | null;
  qty_ordered?: number | null;
  quantity_allocated?: number | null;
  quantity_picked?: number | null;
  quantity_packed?: number | null;
  quantity_shipped?: number | null;
  quantity_received?: number | null;
  status?: string | null;
}

export interface SalesOrderDto {
  so_id?: number | null;
  id?: number | null;
  so_number?: string | null;
  so_barcode?: string | null;
  barcode?: string | null;
  status?: string | null;
  priority?: number | null;
  warehouse_id?: number | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  ship_address?: string | null;
  ship_method?: string | null;
  ship_by_date?: string | null;
  order_type?: string | null;
  order_origin?: string | null;
  parent_so_id?: number | null;
  parent_so_number?: string | null;
  memo?: string | null;
  order_total?: string | number | null;
  customer_shipping_paid?: string | number | null;
  source_system?: string | null;
  carrier?: string | null;
  tracking_number?: string | null;
  cancellation_reason?: string | null;
  created_at?: string | null;
  picked_at?: string | null;
  shipped_at?: string | null;
  shipped_date_local?: string | null;
  [addressField: string]: unknown;
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

export interface SalesOrderListResponseDto {
  sales_orders: SalesOrderDto[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface SalesOrderDetailResponseDto {
  sales_order: SalesOrderDto;
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
