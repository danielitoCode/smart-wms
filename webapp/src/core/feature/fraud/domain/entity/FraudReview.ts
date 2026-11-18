/**
 * Fraud queue projection over SalesOrder rows with status='FRAUD_REVIEW'.
 */
export type FraudReview = {
  salesOrderId: number;
  salesOrderNumber: string;
  status: 'FRAUD_REVIEW';
  orderType: string;
  orderSource: string | null;
  orderOrigin: string | null;
  warehouseId: number;
  customerName: string | null;
  customerPhone: string | null;
  memo: string | null;
  createdAt: string | null;
  billingAddressLine1: string | null;
  billingAddressLine2: string | null;
  billingAddressCity: string | null;
  billingAddressState: string | null;
  billingAddressPostalCode: string | null;
  shippingAddressLine1: string | null;
  shippingAddressLine2: string | null;
  shippingAddressCity: string | null;
  shippingAddressState: string | null;
  shippingAddressPostalCode: string | null;
};

export type FraudReviewPage = {
  items: FraudReview[];
  page: number;
  perPage: number;
  total: number;
  pages: number;
};

export type FraudAuditEntry = {
  logId: number;
  actionType: string;
  username: string | null;
  warehouseId: number | null;
  details: Record<string, unknown> | null;
  createdAt: string | null;
};

export type FraudAuditHistoryPage = {
  entries: FraudAuditEntry[];
  page: number;
  perPage: number;
  total: number;
  pages: number;
};

export type FraudReviewDetail = {
  order: FraudReview;
  sourceSystem: string | null;
  lines: Array<{
    lineId: number;
    itemId: number;
    sku: string | null;
    itemName: string;
    quantityOrdered: number;
    quantityAllocated: number;
    quantityPicked: number;
    quantityPacked: number;
    quantityShipped: number;
    status: string;
  }>;
};

export type UpdateFraudMemo = { salesOrderId: number; memo: string };
export type PushFraudOrderToQueue = { salesOrderId: number };

export function isFraudReviewInWarehouse(order: Pick<FraudReview, 'warehouseId'>, warehouseId: number): boolean {
  return Number.isSafeInteger(warehouseId) && warehouseId > 0 && order.warehouseId === warehouseId;
}
