import { describe, expect, it } from 'vitest';
import { TransferOrderMapper as mapper } from '../../../../../core/feature/transfer-orders/data/mapper/TransferOrderMapper';
import type { TransferOrderHeaderDto, TransferOrderLineDto } from '../../../../../core/feature/transfer-orders/data/dto/TransferOrderDto';

const header: TransferOrderHeaderDto = {
  to_id: 12, to_number: 'TO-12', source_warehouse_id: 2, destination_warehouse_id: 4,
  status: 'PARTIALLY_PICKED', created_by: 'operator', notes: null, external_id: 'ext-12',
  created_at: null, updated_at: null
};
const line: TransferOrderLineDto = {
  to_line_id: 31, to_id: 12, item_id: 7, sku: 'SKU-7', item_name: 'Widget',
  line_number: 1, requested_qty: 10, committed_qty: 8, picked_qty: 5, approved_qty: 2,
  status: 'PARTIALLY_PICKED'
};

describe('TransferOrderMapper', () => {
  it('maps the aggregate, line quantities and approval history without changing units', () => {
    const order = mapper.header(header, [line], [{
      to_approval_id: 9, to_id: 12, submitted_by: 'picker', submitted_at: '2026-11-17T10:00:00Z',
      approved_by: null, approved_at: null, rejected_at: null, rejection_reason: null,
      status: 'PENDING', external_id: 'approval-9'
    }]);
    expect(order.sourceWarehouseId).toBe(2);
    expect(order.destinationWarehouseId).toBe(4);
    expect(order.lines[0]).toMatchObject({ requestedQuantity: 10, committedQuantity: 8, pickedQuantity: 5, approvedQuantity: 2, sku: 'SKU-7' });
    expect(order.approvals[0]).toMatchObject({ approvalId: 9, status: 'PENDING' });
  });

  it('preserves pagination metadata and maps warehouse choices', () => {
    const page = mapper.page({ transfer_orders: [header], total: 101, page: 2, pages: 3, per_page: 50 });
    expect(page).toMatchObject({ total: 101, page: 2, pages: 3, perPage: 50, orders: [{ transferOrderId: 12 }] });
    expect(mapper.warehouse({ id: 4, code: 'WH-4', name: 'Destination' })).toEqual({
      warehouseId: 4, warehouseCode: 'WH-4', warehouseName: 'Destination', active: true
    });
  });

  it('maps all shortage fields returned by the import contract', () => {
    const result = mapper.importResult({
      to_id: 12, to_number: 'TO-12', source_warehouse_id: 2, destination_warehouse_id: 4,
      line_count: 1, shortages: [{ row_index: 0, sku: 'SKU-7', requested_qty: 10, available_qty: 6, committed_qty: 6, shortfall: 4 }]
    });
    expect(result.shortages[0]).toEqual({ rowIndex: 0, sku: 'SKU-7', requestedQuantity: 10, availableQuantity: 6, committedQuantity: 6, shortfall: 4 });
  });
});
