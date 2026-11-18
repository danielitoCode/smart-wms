/** Read-only POS projection over Sales Orders and POS audit events. */
export type PosActivityOrderType = 'sale' | 'refund';
export type PosActivity = {
	salesOrderId: number; salesOrderNumber: string; status: string; orderType: PosActivityOrderType;
	channel: string; createdAt: string | null; customerName: string | null; customerPhone: string | null;
	externalTxnRef: string | null; warehouseId: number; totalCents: number;
	cashierId: string | null; terminalId: string | null; paymentMethod: string | null;
};
export type PosActivityQuery = {
	page?: number; perPage?: number; date?: string | null; terminalId?: string | null;
	cashierId?: string | null; status?: string | null; orderType?: PosActivityOrderType | 'all';
	channel?: 'counter' | 'phone' | null;
};
export type PosActivityPage = { salesOrders: PosActivity[]; total: number; page: number; perPage: number; pages: number };
export type PosActivityKpis = {
	salesCount: number; salesTotalCents: number; refundCount: number; refundTotalCents: number;
	netCents: number; averageSaleCents: number; counterCents: number; counterCount: number;
	phoneCents: number; phoneCount: number;
};
export type PosActivitySummary = {
	date: string; isToday: boolean; currentHour: number; today: PosActivityKpis; yesterday: PosActivityKpis;
	vsYesterdayCents: number; paceToday: { hour: number; cents: number }[]; paceYesterday: { hour: number; cents: number }[];
	weekThis: { date: string; dow: number; netCents: number; isToday: boolean; isFuture: boolean }[];
	weekLast: { date: string; dow: number; netCents: number; isToday: boolean; isFuture: boolean }[];
	weekThisTotalCents: number; weekLastTotalCents: number; tenders: { method: string; cents: number; count: number }[];
	activeTerminals: string[];
};
