/**
 * RMA projection over a child SalesOrder (order_type='return').
 * The backend persists the RMA in sales_orders, its line lineage in
 * original_so_line_id, and inbound goods in item_receipts.
 */
import type { SalesOrder, SalesOrderLine } from '../../../sales-orders/domain/entity/SalesOrder';

export type ReturnStatus = 'OPEN' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CLOSED';

export type ReturnLine = SalesOrderLine & {
	/** Required for a return child line when it can be traced to an original line. */
	originalSalesOrderLineId?: number | null;
};

export type Return = Omit<SalesOrder, 'orderType' | 'lines' | 'status'> & {
	orderType: 'return';
	status: ReturnStatus;
	parentSalesOrderId: number;
	lines: ReturnLine[];
	/** Soft void from migration 076; voided rows remain auditable. */
	voidedAt?: string | null;
	voidedBy?: string | null;
};

export type CreateReturnLine = {
	itemId: number;
	quantity: number;
	originalSalesOrderLineId?: number | null;
};

/** Mirrors CreateRmaRequest; the backend creates the child SO and RMA number. */
export type CreateReturn = {
	lines: CreateReturnLine[];
	memo?: string | null;
};

/** Mirrors ReceiveRmaRequest and creates an item_receipts row against the RMA SO. */
export type ReceiveReturn = {
	itemId: number;
	quantity: number;
	warehouseId: number;
	binId: number;
	notes?: string | null;
	idempotencyKey?: string | null;
};
