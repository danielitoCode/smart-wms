import { describe, expect, it } from 'vitest';
import { ReturnMapper } from '../../../../../core/feature/returns/data/mapper/ReturnMapper';
import type { ReturnHeaderDto, ReturnLineDto, ReturnReceiptDto } from '../../../../../core/feature/returns/data/dto/ReturnDto';

const header: ReturnHeaderDto = {
  so_id:20,so_number:'SO-20-RMA',so_barcode:null,customer_name:'Customer',customer_phone:null,
  customer_email:null,customer_address:null,status:'PARTIALLY_RECEIVED',priority:0,warehouse_id:2,
  ship_method:null,ship_address:null,ship_by_date:null,created_at:null,order_total:null,memo:'Damaged',
  order_origin:null,source_system:null,carrier:null,tracking_number:null,order_type:'return',
  parent_so_id:10,parent_so_number:'SO-10'
};
const line: ReturnLineDto = {
  so_line_id:30,line_number:1,item_id:4,sku:'SKU-4',item_name:'Widget',quantity_ordered:3,
  quantity_allocated:0,quantity_picked:0,quantity_packed:0,quantity_shipped:0,quantity_received:1,
  status:'OPEN',original_so_line_id:11
};
const receipt: ReturnReceiptDto = {
  receipt_id:50,so_line_id:30,item_id:4,sku:'SKU-4',item_name:'Widget',quantity_received:1,
  bin_id:8,bin_code:'RET-A1',warehouse_id:2,warehouse_code:'WH-2',received_by:'operator',
  received_at:'2026-11-16T10:00:00Z',notes:'Box damaged'
};

describe('ReturnMapper', () => {
  it('maps the real return status, parent sale, line lineage and receipt history', () => {
    const result = ReturnMapper.header(header,[line],[receipt]);
    expect(result.status).toBe('PARTIALLY_RECEIVED');
    expect(result.parentSalesOrderId).toBe(10);
    expect(result.parentSalesOrderNumber).toBe('SO-10');
    expect(result.lines[0].originalSalesOrderLineId).toBe(11);
    expect(result.receipts[0]).toMatchObject({ receiptId:50, quantityReceived:1, binCode:'RET-A1', notes:'Box damaged' });
  });

  it('rejects statuses that the RMA service does not produce', () => {
    expect(() => ReturnMapper.header({ ...header, status:'CLOSED' as ReturnHeaderDto['status'] })).toThrow(/Estado de RMA/);
  });

  it('rejects a sales-order projection that is not a return', () => {
    expect(() => ReturnMapper.header({ ...header, order_type:'sale' as 'return' })).toThrow(/no es una devolución/);
  });
});
