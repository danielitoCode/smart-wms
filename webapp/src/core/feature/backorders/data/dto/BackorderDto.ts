export type BackorderStatusDto =
  | 'WAITING_STOCK' | 'OPEN' | 'PICKED' | 'PACKED' | 'SHIPPED'
  | 'CANCELLED' | 'REFUNDED';

export interface BackorderOpenPurchaseOrderDto {
  po_number: string;
  expected_date: string | null;
  quantity_remaining: number;
}

export interface BackorderItemDto {
  sku: string;
  item_name: string;
  qty: number;
  open_po: BackorderOpenPurchaseOrderDto | null;
}

export interface BackorderDto {
  so_id: number;
  so_number: string;
  parent_so_number: string | null;
  warehouse_id: number;
  status: BackorderStatusDto;
  customer_name: string | null;
  items: BackorderItemDto[];
  days_waiting: number;
  backorder_opened_at: string | null;
  fulfillable_since: string | null;
}

export interface BackorderListDto {
  tab: 'waiting' | 'ready-to-ship';
  backorders: BackorderDto[];
}

export interface CancelBackorderResponseDto {
  message: string;
  bo_so_id: number;
  cancellation_reason: string;
  audit_log_id: number | null;
}
