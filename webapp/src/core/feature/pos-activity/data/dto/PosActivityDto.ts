export type PosActivityDto = {
	so_id: number; so_number: string; status: string; order_type: 'sale' | 'refund';
	channel: string; created_at: string | null; customer_name: string | null; customer_phone: string | null;
	external_txn_ref: string | null; warehouse_id: number; total_cents: number;
	cashier_id: string | null; terminal_id: string | null; payment_method: string | null;
};
export type PosActivityListDto = { sales_orders: PosActivityDto[]; total: number; page: number; per_page: number; pages: number };
export type PosPacePointDto = { hour: number; cents: number };
export type PosWeekDayDto = { date: string; dow: number; net_cents: number; is_today: boolean; is_future: boolean };
export type PosTenderDto = { method: string; cents: number; count: number };
export type PosActivitySummaryDto = {
	tz: string; date: string; is_today: boolean; current_hour: number;
	today: { sales_count: number; sales_total_cents: number; refund_count: number; refund_total_cents: number; net_cents: number; avg_sale_cents: number; counter_cents: number; counter_count: number; phone_cents: number; phone_count: number };
	yesterday: { sales_count: number; sales_total_cents: number; refund_count: number; refund_total_cents: number; net_cents: number; avg_sale_cents: number; counter_cents: number; counter_count: number; phone_cents: number; phone_count: number };
	vs_yesterday_cents: number;
	pace: { today: PosPacePointDto[]; yesterday: PosPacePointDto[] };
	week: { this: PosWeekDayDto[]; last: PosWeekDayDto[]; this_total_cents: number; last_total_cents: number };
	tenders: PosTenderDto[];
	active_terminals: string[];
};
