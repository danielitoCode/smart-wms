/**
 * POS activity domain.
 *
 * Represents an auditable operational event emitted by a POS terminal or
 * operator. It is an activity record, not a second sales-order aggregate.
 */

export type PosActivityType =
	| 'SALE_CREATED'
	| 'SALE_COMPLETED'
	| 'SALE_CANCELLED'
	| 'PAYMENT_RECORDED'
	| 'REFUND_CREATED'
	| 'REFUND_COMPLETED'
	| 'CASH_DRAWER_OPENED'
	| 'SHIFT_OPENED'
	| 'SHIFT_CLOSED'
	| 'ITEM_VOIDED'
	| 'PRICE_OVERRIDDEN'
	| 'DISCOUNT_APPLIED'
	| 'LOGIN'
	| 'LOGOUT'
	| 'OTHER'
	| (string & {});

export type PosActivity = {
	activityId: number;
	eventType: PosActivityType;
	occurredAt: string;
	warehouseId?: number | null;
	posId?: string | null;
	terminalId?: string | null;
	shiftId?: string | null;
	userId?: number | null;
	username?: string | null;
	salesOrderId?: number | null;
	refundId?: number | null;
	reference?: string | null;
	description?: string | null;
	amount?: number | null;
	currency?: string | null;
	metadata?: Record<string, unknown> | null;
};

export type PosActivityQuery = {
	from?: string | null;
	to?: string | null;
	warehouseId?: number | null;
	posId?: string | null;
	terminalId?: string | null;
	userId?: number | null;
	eventTypes?: PosActivityType[];
	salesOrderId?: number | null;
	refundId?: number | null;
};
