import type { PosActivity, PosActivityPage, PosActivitySummary, PosActivityKpis } from '../../domain/entity/PosActivity';
import type { PosActivityDto, PosActivitySummaryDto } from '../dto/PosActivityDto';
const kpis = (d: PosActivitySummaryDto['today']): PosActivityKpis => ({
	salesCount:d.sales_count,salesTotalCents:d.sales_total_cents,refundCount:d.refund_count,
	refundTotalCents:d.refund_total_cents,netCents:d.net_cents,averageSaleCents:d.avg_sale_cents,
	counterCents:d.counter_cents,counterCount:d.counter_count,phoneCents:d.phone_cents,phoneCount:d.phone_count
});
export const PosActivityMapper = {
	row(d:PosActivityDto):PosActivity{return {salesOrderId:d.so_id,salesOrderNumber:d.so_number,status:d.status,orderType:d.order_type,channel:d.channel,createdAt:d.created_at,customerName:d.customer_name,customerPhone:d.customer_phone,externalTxnRef:d.external_txn_ref,warehouseId:d.warehouse_id,totalCents:d.total_cents,cashierId:d.cashier_id,terminalId:d.terminal_id,paymentMethod:d.payment_method};},
	page(rows:PosActivityDto[],meta:{total:number;page:number;per_page:number;pages:number}):PosActivityPage{return {salesOrders:rows.map(x=>PosActivityMapper.row(x)),total:meta.total,page:meta.page,perPage:meta.per_page,pages:meta.pages};},
	summary(d:PosActivitySummaryDto):PosActivitySummary{return {
		date:d.date,isToday:d.is_today,currentHour:d.current_hour,today:kpis(d.today),yesterday:kpis(d.yesterday),
		vsYesterdayCents:d.vs_yesterday_cents,paceToday:d.pace.today,paceYesterday:d.pace.yesterday,
		weekThis:d.week.this.map(x=>({date:x.date,dow:x.dow,netCents:x.net_cents,isToday:x.is_today,isFuture:x.is_future})),
		weekLast:d.week.last.map(x=>({date:x.date,dow:x.dow,netCents:x.net_cents,isToday:x.is_today,isFuture:x.is_future})),
		weekThisTotalCents:d.week.this_total_cents,weekLastTotalCents:d.week.last_total_cents,
		tenders:d.tenders,activeTerminals:d.active_terminals
	};}
};
