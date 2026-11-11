/**
 * Refund projection over a credit-memo child SalesOrder (order_type='refund').
 * The backend does not persist an independent Refund aggregate: the child SO
 * stores the negative lines/total and links to the original sale.
 */
import type { SalesOrder, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';

export type Refund = Omit<SalesOrder, 'orderType' | 'lines'> & {
	orderType: 'refund';
	parentSalesOrderId: number;
	/** Credit-memo amount is represented by the signed sales_orders.order_total. */
	orderTotal: number;
	lines: SalesOrderLine[];
};

/** Mirrors the POS refund contract: refund an eligible original POS sale. */
export type CreateRefund = {
	originalSalesOrderNumber: string;
	idempotencyKey: string;
};
