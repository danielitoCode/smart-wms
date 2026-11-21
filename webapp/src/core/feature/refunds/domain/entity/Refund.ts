/**
 * Read-only projection over a POS credit-memo child SalesOrder (order_type='refund').
 * A refund is a monetary/ledger record; it is not a physical return receipt.
 */
import type { SalesOrder, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';

export type RefundStatus = 'SHIPPED' | 'CANCELLED';
export type RefundAmountIntegrity = 'VALID' | 'MISSING' | 'NON_NEGATIVE' | 'LINE_SIGN_MISMATCH';

export type RefundRelatedRecord = {
  salesOrderId: number;
  salesOrderNumber: string;
  orderType: string | null;
  status: string;
  parentSalesOrderId: number | null;
  isVoided: boolean;
  createdAt: string | null;
  signedAmount: number | null;
};

export type Refund = Omit<SalesOrder, 'orderType' | 'lines' | 'externalId' | 'orderTotal' | 'status'> & {
  orderType: 'refund';
  status: RefundStatus;
  externalId?: string | null;
  parentSalesOrderId: number | null;
  /** Positive magnitude for display; signedAmount preserves the ledger value. */
  orderTotal: number;
  signedAmount: number | null;
  amountIntegrity: RefundAmountIntegrity;
  relatedRecords: RefundRelatedRecord[];
  lines: SalesOrderLine[];
};
