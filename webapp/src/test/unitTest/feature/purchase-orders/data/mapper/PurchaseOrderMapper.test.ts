import { describe, expect, it } from 'vitest';
import { PurchaseOrderMapper } from '../../../../../../core/feature/purchase-orders/data/mapper/PurchaseOrderMapper';

describe('PurchaseOrderMapper', () => {
  it('maps ordered, received and remaining quantities without losing the line status', () => {
    const line = PurchaseOrderMapper.line({
      po_line_id: 8, line_number: 2, item_id: 10, sku: 'SKU-10', item_name: 'Widget',
      quantity_ordered: 12, quantity_received: 5, unit_cost: 3.5, status: 'PARTIAL'
    });
    expect(line).toMatchObject({
      poLineId: 8, itemId: 10, quantityOrdered: 12, quantityReceived: 5,
      quantityRemaining: 7, unitCost: 3.5, status: 'PARTIAL'
    });
  });

  it('normalizes over-received lines to zero remaining', () => {
    const line = PurchaseOrderMapper.line({
      po_line_id: 9, line_number: 1, item_id: 11,
      quantity_ordered: 4, quantity_received: 6, unit_cost: null, status: 'RECEIVED'
    });
    expect(line.quantityRemaining).toBe(0);
  });

  it('maps create payload to the exact snake_case backend contract', () => {
    expect(PurchaseOrderMapper.create({
      poNumber: 'PO-4', warehouseId: 3,
      lines: [{ itemId: 7, quantityOrdered: 9, unitCost: 2.75 }],
      vendorName: 'ACME', expectedDate: '2026-12-01', notes: 'Urgent'
    })).toEqual({
      po_number: 'PO-4', warehouse_id: 3,
      lines: [{ item_id: 7, quantity_ordered: 9, unit_cost: 2.75 }],
      po_barcode: null, vendor_name: 'ACME', expected_date: '2026-12-01', notes: 'Urgent'
    });
  });
});
