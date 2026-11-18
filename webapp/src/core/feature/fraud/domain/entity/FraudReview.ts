/**
 * Fraud queue projection over SalesOrder rows with status='FRAUD_REVIEW'.
 * Flask does not persist a separate FraudCase aggregate or expose audit history.
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

export type UpdateFraudMemo = { salesOrderId: number; memo: string };
export type PushFraudOrderToQueue = { salesOrderId: number };
