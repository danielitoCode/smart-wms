import { describe, expect, it } from 'vitest';
import { AdminOperationMapper } from '../../../../../../core/feature/admin-operations/data/mapper/AdminOperationMapper';

describe('AdminOperationMapper', () => {
  it('maps backorder item details into a readable table cell', () => {
    const [row] = AdminOperationMapper.rows('backorders', [{
      so_id: 12,
      so_number: 'SO-12',
      parent_so_number: 'SO-3',
      warehouse_id: 2,
      status: 'WAITING_STOCK',
      customer_name: 'Ada',
      items: [{ sku: 'SKU-1', item_name: 'Widget', qty: 4, open_po: { po_number: 'PO-8', expected_date: null, quantity_remaining: 6 } }],
      days_waiting: 3,
      backorder_opened_at: null,
      fulfillable_since: null
    }]);

    expect(row.id).toBe(12);
    expect(row.cells.items).toBe('SKU-1 × 4 · PO PO-8 (6)');
  });

  it('uses the real transfer_id contract and renders both bin locations', () => {
    const [row] = AdminOperationMapper.rows('inter-warehouse-transfers', [{
      transfer_id: 4,
      item_id: 9,
      sku: 'SKU-9',
      item_name: 'Item 9',
      from_bin_id: 1,
      from_bin_code: 'A-01',
      from_warehouse_id: 2,
      from_warehouse_name: 'North',
      from_warehouse_code: 'N',
      to_bin_id: 3,
      to_bin_code: 'B-02',
      to_warehouse_id: 5,
      to_warehouse_name: 'South',
      to_warehouse_code: 'S',
      quantity: 7,
      transferred_by: 'admin',
      transferred_at: null,
      status: 'completed'
    }]);

    expect(row.id).toBe(4);
    expect(row.cells.transfer_id).toBe(4);
    expect(row.cells.from_bin_code).toBe('A-01');
    expect(row.cells.to_bin_code).toBe('B-02');
  });

  it('maps warehouse arrays and nullable preferred-bin zone values to display-safe cells', () => {
    const [user] = AdminOperationMapper.rows('users', [{
      user_id: 2,
      username: 'ada',
      full_name: 'Ada Lovelace',
      role: 'USER',
      warehouse_id: 1,
      warehouse_ids: [1, 3],
      allowed_functions: ['receiving'],
      is_active: true,
      created_at: null,
      last_login: null
    }]);
    const [bin] = AdminOperationMapper.rows('preferred-bins', [{
      preferred_bin_id: 7,
      item_id: 9,
      bin_id: 11,
      priority: 1,
      notes: null,
      updated_at: null,
      sku: 'SKU-9',
      item_name: 'Item 9',
      bin_code: 'A-11',
      zone_name: null
    }]);

    expect(user.cells.warehouse_ids).toBe('1, 3');
    expect(bin.cells.zone_name).toBeNull();
  });
});
