/**
 * Refund domain.
 *
 * A refund is a monetary operation linked to an order. It is intentionally
 * independent from Returns: an order may be refunded without a physical RMA,
 * and a received return does not itself imply that money was refunded.
 */

export type RefundStatus =
	| 'PENDING'
	| 'PROCESSING'
	| 'COMPLETED'
	| 'FAILED'
	| 'CANCELLED'
	| 'VOIDED'
	| (string & {});

export type RefundMethod =
	| 'ORIGINAL_PAYMENT'
	| 'CASH'
	| 'CARD'
	| 'STORE_CREDIT'
	| 'BANK_TRANSFER'
	| 'OTHER'
	| (string & {});

export type RefundLine = {
	refundLineId: number;
	refundId: number;
	salesOrderLineId: number;
	itemId: number;
	quantity: number;
	amount: number;
	currency?: string | null;
	reason?: string | null;
};

export type Refund = {
	refundId: number;
	refundNumber: string;
	salesOrderId: number;
	salesOrderNumber?: string | null;
	returnId?: number | null;
	customerId?: string | null;
	customerName?: string | null;
	status: RefundStatus;
	method: RefundMethod;
	amount: number;
	currency?: string | null;
	reason?: string | null;
	externalReference?: string | null;
	createdBy?: number | null;
	processedBy?: number | null;
	createdAt?: string | null;
	processedAt?: string | null;
	failureReason?: string | null;
	notes?: string | null;
	lines: RefundLine[];
};

export type CreateRefundLine = {
	salesOrderLineId: number;
	itemId: number;
	quantity: number;
	amount: number;
	reason?: string | null;
};

export type CreateRefund = {
	salesOrderId: number;
	returnId?: number | null;
	method: RefundMethod;
	amount: number;
	currency?: string | null;
	reason?: string | null;
	externalReference?: string | null;
	lines?: CreateRefundLine[];
	notes?: string | null;
};

export type ProcessRefund = {
	refundId: number;
	externalReference?: string | null;
	processedAt?: string | null;
};

export type FailRefund = {
	refundId: number;
	failureReason: string;
};

export type CancelRefund = {
	refundId: number;
	reason?: string | null;
};
