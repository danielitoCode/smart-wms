import type { PurchaseOrderStatus, PurchaseOrderLineStatus } from '../../domain/entity/PurchaseOrder';

export type PurchaseOrderLineDto = {
  po_line_id: number; line_number: number; item_id: number;
  sku?: string | null; item_name?: string | null; upc?: string | null; mpn?: string | null;
  quantity_ordered: number; quantity_received: number; unit_cost: number | null;
  status: PurchaseOrderLineStatus;
};
export type PurchaseOrderDto = {
  po_id: number; po_number: string; po_barcode?: string | null; vendor_id?: string | null;
  vendor_name: string | null; status: PurchaseOrderStatus; expected_date: string | null;
  warehouse_id: number; notes: string | null; created_at: string | null;
  received_at?: string | null; created_by?: string | null;
};
export type PurchaseOrderListDto = {
  purchase_orders: PurchaseOrderDto[]; total: number; page: number; per_page: number; pages: number;
};
export type PurchaseOrderDetailDto = { purchase_order: PurchaseOrderDto; lines: PurchaseOrderLineDto[] };
export type PurchaseOrderReceiptDto = {
  receipt_id: number; po_line_id: number | null; line_number: number | null; item_id: number;
  sku: string; item_name: string; quantity_received: number; bin_id: number; bin_code: string;
  warehouse_id: number; received_by: string; received_at: string | null;
  lot_number: string | null; serial_number: string | null; notes: string | null;
};
export type PurchaseOrderReceiptsDto = { po_id: number; receipts: PurchaseOrderReceiptDto[] };
