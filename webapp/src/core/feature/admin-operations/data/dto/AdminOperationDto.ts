/**
 * Wire contracts for read-only administrative projections.
 * These DTOs mirror Flask response payloads and never leak into the UI.
 */

export type BackorderItemDto = {
  sku: string;
  item_name: string;
  qty: number;
  open_po: {
    po_number: string;
    expected_date: string | null;
    quantity_remaining: number;
  } | null;
};

export type BackorderDto = {
  so_id: number;
  so_number: string;
  parent_so_number: string | null;
  warehouse_id: number;
  status: string;
  customer_name: string | null;
  items: BackorderItemDto[];
  days_waiting: number;
  backorder_opened_at: string | null;
  fulfillable_since: string | null;
};

export type AdjustmentDto = {
  adjustment_id: number;
  item_id: number;
  bin_id: number;
  warehouse_id: number;
  quantity_change: number;
  reason_code: string;
  reason_detail: string | null;
  status: string;
  adjusted_by: string;
  adjusted_at: string | null;
  cycle_count_id: number | null;
  sku: string;
  item_name: string;
  bin_code: string;
  expected_quantity?: number | null;
  counted_quantity?: number | null;
  username?: string | null;
};

export type SalesOrderDto = {
  so_id: number;
  so_number: string;
  status: string;
  order_type: string;
  parent_so_id: number | null;
  warehouse_id: number;
  customer_name: string | null;
  customer_phone: string | null;
  memo: string | null;
  created_at: string | null;
};

export type InterWarehouseTransferDto = {
  transfer_id: number;
  item_id: number;
  sku: string;
  item_name: string;
  from_bin_id: number;
  from_bin_code: string;
  from_warehouse_id: number;
  from_warehouse_name: string;
  from_warehouse_code: string;
  to_bin_id: number;
  to_bin_code: string;
  to_warehouse_id: number;
  to_warehouse_name: string;
  to_warehouse_code: string;
  quantity: number;
  transferred_by: string;
  transferred_at: string | null;
  status: 'completed';
};

export type PosActivityDto = {
  so_id: number;
  so_number: string;
  status: string;
  order_type: 'sale' | 'refund';
  channel: string;
  created_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  external_txn_ref: string | null;
  warehouse_id: number;
  total_cents: number;
  cashier_id: string | null;
  terminal_id: string | null;
  payment_method: string | null;
};

export type PosActivitySummaryDto = {
  date: string;
  is_today: boolean;
  today: {
    sales_count: number;
    refund_count: number;
    net_cents: number;
    sales_total_cents: number;
    refund_total_cents: number;
    avg_sale_cents: number;
    counter_cents: number;
    counter_count: number;
    phone_cents: number;
    phone_count: number;
  };
  week: {
    this_total_cents: number;
    last_total_cents: number;
  };
  active_terminals: string[];
  vs_yesterday_cents: number;
};

export type PreferredBinDto = {
  preferred_bin_id: number;
  item_id: number;
  bin_id: number;
  priority: number;
  notes: string | null;
  updated_at: string | null;
  sku: string;
  item_name: string;
  bin_code: string;
  zone_name: string | null;
};

export type PurchaseOrderDto = {
  po_id: number;
  po_number: string;
  vendor_name: string | null;
  status: string;
  expected_date: string | null;
  warehouse_id: number;
  notes: string | null;
  created_at: string | null;
  received_at?: string | null;
  created_by?: string | null;
};

export type TransferOrderDto = {
  to_id: number;
  to_number: string;
  source_warehouse_id: number;
  destination_warehouse_id: number;
  status: string;
  created_by: string;
  notes: string | null;
  external_id: string;
  created_at: string | null;
  updated_at: string | null;
};

export type UserDto = {
  user_id: number;
  username: string;
  full_name: string;
  role: string;
  warehouse_id: number | null;
  warehouse_ids: number[];
  allowed_functions: string[];
  is_active: boolean;
  created_at: string | null;
  last_login: string | null;
};

export type VendorDto = {
  canonical_id: string;
  external_id: string;
  vendor_name: string | null;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  payment_terms: string | null;
  is_active: boolean | null;
};

export type AdminOperationDto =
  | BackorderDto
  | AdjustmentDto
  | SalesOrderDto
  | InterWarehouseTransferDto
  | PosActivityDto
  | PreferredBinDto
  | PurchaseOrderDto
  | TransferOrderDto
  | UserDto
  | VendorDto;


export type AdminOperationRemotePagination = {
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

export type AdminOperationRemoteResult =
  | { feature: 'backorders'; rows: BackorderDto[]; summary: null; pagination: null }
  | { feature: 'count-approvals'; rows: AdjustmentDto[]; summary: null; pagination: null }
  | { feature: 'fraud'; rows: SalesOrderDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'inter-warehouse-transfers'; rows: InterWarehouseTransferDto[]; summary: null; pagination: null }
  | { feature: 'adjustments'; rows: AdjustmentDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'pos-activity'; rows: PosActivityDto[]; summary: PosActivitySummaryDto; pagination: AdminOperationRemotePagination }
  | { feature: 'preferred-bins'; rows: PreferredBinDto[]; summary: null; pagination: null }
  | { feature: 'purchase-orders'; rows: PurchaseOrderDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'refunds'; rows: SalesOrderDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'returns'; rows: SalesOrderDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'transfer-orders'; rows: TransferOrderDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'users'; rows: UserDto[]; summary: null; pagination: AdminOperationRemotePagination }
  | { feature: 'vendors'; rows: VendorDto[]; summary: null; pagination: AdminOperationRemotePagination };
