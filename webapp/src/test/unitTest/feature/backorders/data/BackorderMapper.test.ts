import { describe, expect, it } from 'vitest';
import { BackorderMapper } from '../../../../../core/feature/backorders/data/mapper/BackorderMapper';
import type { BackorderDto } from '../../../../../core/feature/backorders/data/dto/BackorderDto';

const waitingDto: BackorderDto = {
  so_id: 41, so_number: 'BO-41', parent_so_number: 'SO-10', warehouse_id: 3,
  status: 'WAITING_STOCK', customer_name: 'Customer', days_waiting: 12,
  backorder_opened_at: '2026-11-01T00:00:00Z', fulfillable_since: null,
  items: [{
    sku: 'SKU-1', item_name: 'Item 1', qty: 4,
    open_po: { po_number: 'PO-9', expected_date: '2026-11-20', quantity_remaining: 6 }
  }]
};

describe('BackorderMapper', () => {
  it('maps a no-availability backorder and its open purchase-order projection', () => {
    const result = BackorderMapper.toDomain(waitingDto);
    expect(result.status).toBe('WAITING_STOCK');
    expect(result.daysWaiting).toBe(12);
    expect(result.items[0]).toMatchObject({
      sku: 'SKU-1', itemName: 'Item 1', quantity: 4,
      openPurchaseOrder: {
        purchaseOrderNumber: 'PO-9', expectedDate: '2026-11-20', quantityRemaining: 6
      }
    });
    expect(result.parentSalesOrderNumber).toBe('SO-10');
    expect(result.parentSalesOrderId).toBeUndefined();
  });

  it('maps a partially resolved row into the ready-to-ship queue without changing its quantities', () => {
    const result = BackorderMapper.toDomain({
      ...waitingDto,
      status: 'OPEN',
      fulfillable_since: '2026-11-15T10:00:00Z',
      items: [{ sku: 'SKU-1', item_name: 'Item 1', qty: 2, open_po: null }]
    });
    expect(result.status).toBe('OPEN');
    expect(result.fulfillableSince).toBe('2026-11-15T10:00:00Z');
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].openPurchaseOrder).toBeNull();
  });
});
