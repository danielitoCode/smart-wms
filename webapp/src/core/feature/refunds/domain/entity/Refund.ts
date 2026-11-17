/**
 * Read-only projection over a POS credit-memo child SalesOrder (order_type='refund').
 * The backend stores negative order_total/line quantities and links the memo
 * to its original sale. Refund is a view of that record, not a new aggregate.
 */
import type { SalesOrder, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';

export type RefundAmountIntegrity = 'VALID' | 'MISSING' | 'NON_NEGATIVE';

export type RefundRelatedRecord = {
  salesOrderId: number;
  salesOrderNumber: string;
  orderType: string | null;
  status: string;
  parentSalesOrderId: number | null;
  isVoided: boolean;
  createdAt: string | null;
};

export type Refund = Omit<SalesOrder, 'orderType' | 'lines' | 'externalId' | 'orderTotal'> & {
  orderType: 'refund';
  externalId?: string | null;
  parentSalesOrderId: number | null;
  /** Positive magnitude for display; signedAmount preserves the ledger value. */
  orderTotal: number;
  signedAmount: number | null;
  amountIntegrity: RefundAmountIntegrity;
  relatedRecords: RefundRelatedRecord[];
  lines: SalesOrderLine[];
};
