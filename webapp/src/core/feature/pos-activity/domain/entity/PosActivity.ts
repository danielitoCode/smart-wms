/**
 * POS Activity is a read projection, not a generic event stream.
 * The backend derives rows from POS sales_orders and their POS_CHECKOUT /
 * POS_REFUND audit_log entries.
 */
export type PosActivityOrderType = 'sale' | 'refund';

export type PosActivity = {
	salesOrderId: number;
	salesOrderNumber: string;
	status: string;
	orderType: PosActivityOrderType;
	channel: 'POS' | 'Phone Order' | string;
	createdAt: string | null;
	customerName: string | null;
	customerPhone: string | null;
	externalTxnRef: string | null;
	warehouseId: number;
	/** Signed amount is returned in integer cents by the admin POS endpoint. */
	totalCents: number;
	cashierId: string | null;
	terminalId: string | null;
	paymentMethod: string | null;
};

export type PosActivityQuery = {
	page?: number;
	perPage?: number;
	date?: string | null;
	terminalId?: string | null;
	cashierId?: string | null;
	status?: string | null;
	orderType?: PosActivityOrderType | 'all';
	channel?: 'counter' | 'phone' | null;
};

export type PosActivityPage = {
	salesOrders: PosActivity[];
	total: number;
	page: number;
	perPage: number;
	pages: number;
};

export type PosActivitySummary = {
	salesCount: number;
	salesTotalCents: number;
	refundCount: number;
	refundTotalCents: number;
	netCents: number;
	averageSaleCents: number;
	counterCents: number;
	counterCount: number;
	phoneCents: number;
	phoneCount: number;
};
