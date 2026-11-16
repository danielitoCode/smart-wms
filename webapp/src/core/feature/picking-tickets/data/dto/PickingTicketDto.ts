export interface PickingTicketLineDto {
  so_line_id: number; line_number: number | null; sku: string; item_name: string;
  upc: string | null; quantity_ordered: number; quantity_shipped: number;
  preferred_bin_code: string | null;
}
export interface PickingTicketOrderDto {
  so_id: number; so_number: string; customer_name: string | null; status: string;
  warehouse_id: number; ship_method: string | null; ship_address: string | null;
  order_date: string | null; ship_by_date: string | null; created_at: string | null;
  shipping_address_name: string | null; shipping_address_line1: string | null;
  shipping_address_line2: string | null; shipping_address_city: string | null;
  shipping_address_state: string | null; shipping_address_postal_code: string | null;
  shipping_address_country: string | null;
}
export interface PickingTicketResponseDto {
  sales_order: PickingTicketOrderDto | null;
  lines: PickingTicketLineDto[];
  branding: { logo_url?: string | null; company_name?: string | null; company_address?: string | null; returns_text?: string | null };
}
export interface MarkPrintedRequestDto { so_ids: number[]; }
export interface MarkPrintedResponseDto { marked: Array<{ so_id: number; printed_at: string }>; }
