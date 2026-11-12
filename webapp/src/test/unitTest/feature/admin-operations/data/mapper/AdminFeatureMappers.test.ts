import { describe, expect, it } from 'vitest';
import { BackorderMapper } from '../../../../../../core/feature/backorders/data/mapper/BackorderMapper';
import { CycleCountApprovalMapper } from '../../../../../../core/feature/cycle-count-approvals/data/mapper/CycleCountApprovalMapper';
import { FraudReviewMapper } from '../../../../../../core/feature/fraud/data/mapper/FraudReviewMapper';
import { InterWarehouseTransferMapper } from '../../../../../../core/feature/inter-warehouse-transfers/data/mapper/InterWarehouseTransferMapper';
import { InventoryAdjustmentMapper } from '../../../../../../core/feature/inventory-adjustments/data/mapper/InventoryAdjustmentMapper';
import { PosActivityMapper } from '../../../../../../core/feature/pos-activity/data/mapper/PosActivityMapper';
import { TransferOrderMapper } from '../../../../../../core/feature/transfer-orders/data/mapper/TransferOrderMapper';
import { VendorMapper } from '../../../../../../core/feature/vendors/data/mapper/VendorMapper';
import { ManagedUserMapper } from '../../../../../../core/feature/users/data/mapper/ManagedUserMapper';

describe('admin feature mappers', () => {
 it('maps backorder projections without inventing unavailable identifiers', () => {
  const row=BackorderMapper.toDomain({so_id:7,so_number:'SO-7',parent_so_number:'SO-1',warehouse_id:2,status:'BACKORDERED',customer_name:'Ada',items:[{sku:'SKU-1',item_name:'Item',qty:3,open_po:null}],days_waiting:4,backorder_opened_at:'2026-11-01',fulfillable_since:null});
  expect(row).toMatchObject({salesOrderId:7,salesOrderNumber:'SO-7',parentSalesOrderId:null,warehouseId:2,daysWaiting:4});
  expect(row.items[0]).toMatchObject({itemId:null,sku:'SKU-1',quantity:3,openPurchaseOrder:null});
 });
 it('groups cycle count approvals by count id and preserves decision defaults', () => {
  const groups=CycleCountApprovalMapper.group([
   {adjustment_id:1,item_id:2,bin_id:3,warehouse_id:4,quantity_change:-2,expected_quantity:8,counted_quantity:6,reason_code:'COUNT_VARIANCE',reason_detail:null,status:'PENDING',adjusted_by:'operator',adjusted_at:null,cycle_count_id:11,sku:'A',item_name:'Item A',bin_code:'A-01'},
   {adjustment_id:2,item_id:5,bin_id:3,warehouse_id:4,quantity_change:1,expected_quantity:4,counted_quantity:5,reason_code:'COUNT_VARIANCE',reason_detail:null,status:'PENDING',adjusted_by:'operator',adjusted_at:null,cycle_count_id:11,sku:'B',item_name:'Item B',bin_code:'A-01'}
  ]);
  expect(groups).toHaveLength(1);expect(groups[0].cycleCountId).toBe(11);expect(groups[0].adjustments).toHaveLength(2);expect(groups[0].adjustments[0].decision).toBe('approve');
 });
 it('maps fraud-review fields from the sales-order contract', () => {
  expect(FraudReviewMapper.toDomain({so_id:8,so_number:'SO-8',status:'FRAUD_REVIEW',order_type:'sale',order_source:'POS',order_origin:'WEB',warehouse_id:3,customer_name:'Ada',customer_phone:null,memo:'Check',created_at:null})).toMatchObject({salesOrderId:8,salesOrderNumber:'SO-8',orderSource:'POS',orderOrigin:'WEB',memo:'Check'});
 });
 it('maps inter-warehouse movement locators and quantities', () => {
  expect(InterWarehouseTransferMapper.toDomain({transfer_id:1,item_id:9,sku:'SKU-9',item_name:'Item 9',from_bin_id:10,from_bin_code:'A-1',from_warehouse_id:2,from_warehouse_name:'North',from_warehouse_code:'N',to_bin_id:20,to_bin_code:'B-1',to_warehouse_id:3,to_warehouse_name:'South',to_warehouse_code:'S',quantity:6,transferred_by:'admin',transferred_at:null,status:'completed'})).toMatchObject({transferId:1,sourceWarehouseName:'North',destinationWarehouseCode:'S',lines:[{itemId:9,quantity:6}]});
 });
 it('maps inventory adjustment quantities and cycle count references', () => {
  expect(InventoryAdjustmentMapper.toDomain({adjustment_id:4,item_id:9,bin_id:10,warehouse_id:2,quantity_change:-3,reason_code:'COUNT_VARIANCE',reason_detail:null,status:'PENDING',adjusted_by:'operator',adjusted_at:null,cycle_count_id:21,sku:'SKU-9',item_name:'Item 9',bin_code:'A-1',expected_quantity:8,counted_quantity:5})).toMatchObject({adjustmentId:4,quantityChange:-3,cycleCountId:21,expectedQuantity:8,countedQuantity:5});
 });
 it('maps POS summary values in cents without converting them twice', () => {
  expect(PosActivityMapper.summary({date:'2026-11-12',is_today:true,today:{sales_count:2,refund_count:1,net_cents:1500,sales_total_cents:2000,refund_total_cents:500,avg_sale_cents:1000,counter_cents:1200,counter_count:1,phone_cents:800,phone_count:1},week:{this_total_cents:10000,last_total_cents:9000},active_terminals:['T1'],vs_yesterday_cents:300})).toMatchObject({salesCount:2,refundCount:1,netCents:1500,averageSaleCents:1000});
 });
 it('maps transfer order headers, lines and approval rows', () => {
  const mapped=TransferOrderMapper.header({to_id:1,to_number:'TO-1',source_warehouse_id:2,destination_warehouse_id:3,status:'AWAITING_APPROVAL',created_by:'admin',notes:null,external_id:'ext',created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z'},[{to_line_id:4,to_id:1,item_id:9,sku:'SKU-9',item_name:'Item',line_number:1,requested_qty:8,committed_qty:8,picked_qty:7,approved_qty:0,status:'PARTIALLY_PICKED'}],[{to_approval_id:5,to_id:1,submitted_by:'picker',submitted_at:null,approved_by:null,approved_at:null,rejected_at:null,rejection_reason:null,status:'PENDING',external_id:'approval'}]);
  expect(mapped).toMatchObject({transferOrderId:1,transferOrderNumber:'TO-1',lines:[{toLineId:4,requestedQuantity:8,pickedQuantity:7}],approvals:[{approvalId:5,status:'PENDING'}]});
 });
 it('maps vendor and user snake-case payloads to domain names', () => {
  expect(VendorMapper.toDomain({canonical_id:'v-1',external_id:'ext-1',vendor_name:'Vendor',contact_name:null,email:null,phone:null,billing_address:null,remit_to_address:null,tax_id:null,payment_terms:null,is_active:true,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z'})).toMatchObject({canonicalId:'v-1',vendorName:'Vendor',isActive:true});
  expect(ManagedUserMapper.toDomain({user_id:5,username:'ada',full_name:'Ada Lovelace',role:'USER',warehouse_id:2,warehouse_ids:[2,3],allowed_functions:['receive'],is_active:true})).toMatchObject({userId:5,fullName:'Ada Lovelace',warehouseIds:[2,3],allowedFunctions:['receive']});
 });
});
