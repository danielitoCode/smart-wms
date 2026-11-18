import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { PosActivityRemoteDataSource } from '#core/feature/pos-activity/data/datasource/PosActivityRemoteDataSource';
import { PosActivityMapper } from '#core/feature/pos-activity/data/mapper/PosActivityMapper';
describe('POS Activity Flask contracts',()=>{
	it('sends supported list filters and pagination',async()=>{
		const get=vi.fn().mockResolvedValue({sales_orders:[],total:0,page:2,per_page:25,pages:0});
		const source=new PosActivityRemoteDataSource({get} as unknown as ApiClient);
		await source.list({page:2,perPage:25,date:'2026-11-17',orderType:'all',channel:'phone',status:'CANCELLED',terminalId:'REG-2',cashierId:'alice'});
		const url=new URL(get.mock.calls[0][0],'https://example.test');
		expect(url.pathname).toBe('/api/admin/pos/sales-orders');
		expect(Object.fromEntries(url.searchParams.entries())).toEqual({page:'2',per_page:'25',order_type:'all',date:'2026-11-17',terminal_id:'REG-2',cashier_id:'alice',status:'CANCELLED',channel:'phone'});
	});
	it('maps signed sale/refund cents and nullable audit fields',()=>{
		const page=PosActivityMapper.page([{so_id:9,so_number:'POS-9',status:'CANCELLED',order_type:'refund',channel:'Phone Order',created_at:null,customer_name:null,customer_phone:null,external_txn_ref:null,warehouse_id:4,total_cents:-1200,cashier_id:null,terminal_id:null,payment_method:null}],{total:1,page:1,per_page:50,pages:1});
		expect(page.salesOrders[0]).toMatchObject({salesOrderId:9,orderType:'refund',status:'CANCELLED',totalCents:-1200,channel:'Phone Order',cashierId:null});
	});
	it('maps summary pace, weekly comparison, tender split and terminals',()=>{
		const summary=PosActivityMapper.summary({tz:'America/Denver',date:'2026-11-17',is_today:true,current_hour:10,today:{sales_count:2,sales_total_cents:5000,refund_count:1,refund_total_cents:500,net_cents:4500,avg_sale_cents:2500,counter_cents:3000,counter_count:1,phone_cents:2000,phone_count:1},yesterday:{sales_count:1,sales_total_cents:1000,refund_count:0,refund_total_cents:0,net_cents:1000,avg_sale_cents:1000,counter_cents:1000,counter_count:1,phone_cents:0,phone_count:0},vs_yesterday_cents:3500,pace:{today:[{hour:10,cents:4500}],yesterday:[{hour:10,cents:1000}]},week:{this:[{date:'2026-11-17',dow:1,net_cents:4500,is_today:true,is_future:false}],last:[{date:'2026-11-10',dow:1,net_cents:1000,is_today:false,is_future:false}],this_total_cents:4500,last_total_cents:1000},tenders:[{method:'cash',cents:3000,count:1}],active_terminals:['REG-1']});
		expect(summary).toMatchObject({date:'2026-11-17',isToday:true,vsYesterdayCents:3500,weekThisTotalCents:4500,tenders:[{method:'cash',cents:3000}],activeTerminals:['REG-1']});
		expect(summary.paceToday[0].cents).toBe(4500);
	});
});
