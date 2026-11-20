import type { SalesOrder, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';

export type BackorderStatus =
  | 'WAITING_STOCK' | 'OPEN' | 'PICKED' | 'PACKED' | 'SHIPPED'
  | 'CANCELLED' | 'REFUNDED';

export type BackorderInboundPurchaseOrder = {
  purchaseOrderNumber: string;
  expectedDate: string | null;
  quantityRemaining: number;
};

export type BackorderItem = {
  itemId: number | null;
  sku: string;
  itemName: string;
  /** Quantity currently recorded on the backorder list endpoint. */
  quantity: number;
  openPurchaseOrder: BackorderInboundPurchaseOrder | null;
};

/**
 * Operational quantity projection for a backorder line.
 * "Resolved" means shipped, not merely allocated, picked or packed.
 */
export type BackorderLineProgress = {
  line: SalesOrderLine;
  quantityPending: number;
  quantityResolved: number;
};

export type Backorder = {
  salesOrderId: number;
  salesOrderNumber: string;
  /** Not supplied by GET /admin/backorders; resolved from sales-order detail only. */
  parentSalesOrderId?: number | null;
  parentSalesOrderNumber: string | null;
  warehouseId: number;
  customerName: string | null;
  status: BackorderStatus;
  openedAt: string | null;
  fulfillableSince: string | null;
  daysWaiting: number;
  cancellationReason?: string | null;
  items: BackorderItem[];
};

export type BackorderQueueTab = 'waiting' | 'ready-to-ship';

export type BackorderAuditEntry = {
  logId: number;
  actionType: string;
  username: string | null;
  warehouseId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string | null;
};

export type BackorderAuditHistoryPage = {
  entries: BackorderAuditEntry[];
  page: number;
  perPage: number;
  total: number;
  pages: number;
};
export type CancelBackorderReason = 'found' | 'customer_asked' | 'refunded' | 'other';

export type CancelBackorderInput = {
  backorderSalesOrderId: number;
  reason: CancelBackorderReason;
};

export type BackorderDetail = {
  /** The backorder itself, fetched from the Sales Orders detail contract. */
  order: SalesOrder;
  /** Null for POS shortage orders without a parent; never inferred from the list row. */
  parentSalesOrder: SalesOrder | null;
  lines: BackorderLineProgress[];
  totalQuantityPending: number;
  totalQuantityResolved: number;
};

export function projectBackorderLineProgress(line: SalesOrderLine): BackorderLineProgress {
  const ordered = Math.max(0, line.quantityOrdered);
  const resolved = Math.min(ordered, Math.max(0, line.quantityShipped));
  return {
    line,
    quantityPending: ordered - resolved,
    quantityResolved: resolved
  };
}
