import type { SalesOrder } from '../../../sales-orders/domain/entity/SalesOrder';

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
  quantity: number;
  openPurchaseOrder: BackorderInboundPurchaseOrder | null;
};

export type Backorder = {
  salesOrderId: number;
  salesOrderNumber: string;
  parentSalesOrderId: number | null;
  parentSalesOrderNumber: string;
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
export type CancelBackorderReason = 'found' | 'customer_asked' | 'refunded' | 'other';

export type CancelBackorderInput = {
  backorderSalesOrderId: number;
  reason: CancelBackorderReason;
};

export type BackorderDetail = {
  order: SalesOrder;
  parentSalesOrder: SalesOrder | null;
};
