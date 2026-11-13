import { describe, expect, it } from 'vitest';
import { AdminOperationMapper } from '../../../../../../core/feature/admin-operations/data/mapper/AdminOperationMapper';

describe('AdminOperationMapper typed projections', () => {
  it('maps nested backorder items and their open purchase order', () => {
    const [row] = AdminOperationMapper.backorders([{
      so_id: 12,
      so_number: 'SO-12',
      parent_so_number: 'SO-3',
      warehouse_id: 2,
      status: 'WAITING_STOCK',
      customer_name: 'Ada',
      items: [{
        sku: 'SKU-1',
        item_name: 'Widget',
        qty: 4,
        open_po: { po_number: 'PO-8', expected_date: '2026-11-20', quantity_remaining: 6 }
      }],
      days_waiting: 3,
      backorder_opened_at: null,
      fulfillable_since: null
    }]);

    expect(row).toMatchObject({
      feature: 'backorders',
      id: 12,
      data: {
        salesOrderNumber: 'SO-12',
        parentSalesOrderNumber: 'SO-3',
        items: [{
          sku: 'SKU-1',
          itemName: 'Widget',
          quantity: 4,
          openPurchaseOrder: {
            number: 'PO-8',
            expectedDate: '2026-11-20',
            quantityRemaining: 6
          }
        }]
      }
    });
  });

  it('maps pending count approvals without losing expected and counted quantities', () => {
    const [row] = AdminOperationMapper.countApprovals([{
      adjustment_id: 2,
      item_id: 9,
      bin_id: 10,
      warehouse_id: 1,
      quantity_change: -2,
      reason_code: 'COUNT_VARIANCE',
      reason_detail: 'Damaged packaging',
      status: 'PENDING',
      adjusted_by: 'operator',
      adjusted_at: null,
      cycle_count_id: 15,
      sku: 'SKU-9',
      item_name: 'Item 9',
      bin_code: 'A-10',
      expected_quantity: 8,
      counted_quantity: 6,
      username: 'operator'
    }]);

    expect(row.feature).toBe('count-approvals');
    expect(row.data).toMatchObject({
      cycleCountId: 15,
      expectedQuantity: 8,
      countedQuantity: 6,
      quantityChange: -2,
      reasonDetail: 'Damaged packaging'
    });
  });

  it('maps adjustments to a separate typed projection', () => {
    const [row] = AdminOperationMapper.adjustments([{
      adjustment_id: 4,
      item_id: 9,
      bin_id: 10,
      warehouse_id: 1,
      quantity_change: 3,
      reason_code: 'DIRECT_ADJUSTMENT',
      reason_detail: 'Cycle correction',
      status: 'APPROVED',
      adjusted_by: 'admin',
      adjusted_at: '2026-11-12T12:00:00Z',
      cycle_count_id: null,
      sku: 'SKU-9',
      item_name: 'Item 9',
      bin_code: 'A-10',
      expected_quantity: null,
      counted_quantity: null
    }]);

    expect(row.data).toMatchObject({
      adjustmentId: 4,
      adjustedBy: 'admin',
      reasonDetail: 'Cycle correction',
      quantityChange: 3
    });
  });

  it('maps sales order projections for fraud, returns and refunds', () => {
    const dto = {
      so_id: 8,
      so_number: 'SO-8',
      status: 'FRAUD_REVIEW',
      order_type: 'sale',
      order_source: 'POS',
      order_origin: 'WEB',
      warehouse_id: 3,
      customer_name: 'Ada',
      customer_phone: '555-0100',
      parent_so_number: 'SO-1',
      memo: 'Review requested',
      created_at: '2026-11-12T09:00:00Z',
      order_total: 125.5
    };

    expect(AdminOperationMapper.fraud([dto])[0].data).toMatchObject({
      salesOrderNumber: 'SO-8',
      orderSource: 'POS',
      customerPhone: '555-0100'
    });
    expect(AdminOperationMapper.refunds([dto])[0].feature).toBe('refunds');
    expect(AdminOperationMapper.returns([dto])[0].feature).toBe('returns');
  });

  it('maps transfer source and destination locators without flattening away their meaning', () => {
    const [row] = AdminOperationMapper.interWarehouseTransfers([{
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
    expect(row.data).toMatchObject({
      sourceWarehouseName: 'North',
      sourceWarehouseCode: 'N',
      sourceBinCode: 'A-01',
      destinationWarehouseName: 'South',
      destinationWarehouseCode: 'S',
      destinationBinCode: 'B-02',
      quantity: 7
    });
  });

  it('maps POS totals in cents and distinguishes sale from refund', () => {
    const [row] = AdminOperationMapper.posActivity([{
      so_id: 22,
      so_number: 'POS-22',
      status: 'SHIPPED',
      order_type: 'refund',
      channel: 'COUNTER',
      created_at: '2026-11-12T12:00:00Z',
      customer_name: 'Ada',
      customer_phone: null,
      external_txn_ref: 'TX-1',
      warehouse_id: 1,
      total_cents: 1250,
      cashier_id: 'cashier',
      terminal_id: 'T-1',
      payment_method: 'CASH'
    }]);

    expect(row.data).toMatchObject({
      salesOrderNumber: 'POS-22',
      orderType: 'refund',
      totalCents: 1250,
      externalTransactionReference: 'TX-1'
    });
  });

  it('preserves nullable preferred-bin zone and notes', () => {
    const [row] = AdminOperationMapper.preferredBins([{
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

    expect(row.data).toMatchObject({
      sku: 'SKU-9',
      binCode: 'A-11',
      zoneName: null,
      notes: null
    });
  });

  it('maps purchase order receipt metadata', () => {
    const [row] = AdminOperationMapper.purchaseOrders([{
      po_id: 3,
      po_number: 'PO-3',
      vendor_name: 'Vendor',
      status: 'PARTIAL',
      expected_date: '2026-11-20',
      warehouse_id: 2,
      notes: null,
      created_at: '2026-11-01T10:00:00Z',
      received_at: null,
      created_by: 'buyer'
    }]);

    expect(row.data).toMatchObject({
      purchaseOrderNumber: 'PO-3',
      expectedDate: '2026-11-20',
      receivedAt: null,
      createdBy: 'buyer'
    });
  });

  it('maps transfer order header dates and notes', () => {
    const [row] = AdminOperationMapper.transferOrders([{
      to_id: 4,
      to_number: 'TO-4',
      source_warehouse_id: 1,
      destination_warehouse_id: 2,
      status: 'AWAITING_APPROVAL',
      created_by: 'admin',
      notes: 'Urgent',
      external_id: 'external-4',
      created_at: '2026-11-10T10:00:00Z',
      updated_at: '2026-11-11T10:00:00Z'
    }]);

    expect(row.data).toMatchObject({
      transferOrderNumber: 'TO-4',
      sourceWarehouseId: 1,
      destinationWarehouseId: 2,
      notes: 'Urgent'
    });
  });

  it('keeps user warehouse and allowed-function collections typed', () => {
    const [row] = AdminOperationMapper.users([{
      user_id: 2,
      username: 'ada',
      full_name: 'Ada Lovelace',
      role: 'USER',
      warehouse_id: 1,
      warehouse_ids: [1, 3],
      allowed_functions: ['receiving', 'picking'],
      is_active: true,
      created_at: null,
      last_login: null
    }]);

    expect(row.data).toMatchObject({
      username: 'ada',
      fullName: 'Ada Lovelace',
      warehouseIds: [1, 3],
      allowedFunctions: ['receiving', 'picking'],
      active: true
    });
  });

  it('maps nullable vendor contact and active state', () => {
    const [row] = AdminOperationMapper.vendors([{
      canonical_id: 'vendor-1',
      external_id: 'external-1',
      vendor_name: 'Vendor',
      contact_name: null,
      email: null,
      phone: null,
      payment_terms: null,
      is_active: null
    }]);

    expect(row.data).toMatchObject({
      vendorName: 'Vendor',
      contactName: null,
      active: null
    });
  });

  it('maps POS summary into camel-case domain metrics', () => {
    expect(AdminOperationMapper.posSummary({
      date: '2026-11-12',
      is_today: true,
      today: {
        sales_count: 2,
        refund_count: 1,
        net_cents: 1500,
        sales_total_cents: 2000,
        refund_total_cents: 500,
        avg_sale_cents: 1000,
        counter_cents: 1200,
        counter_count: 1,
        phone_cents: 800,
        phone_count: 1
      },
      week: { this_total_cents: 10000, last_total_cents: 9000 },
      active_terminals: ['T1'],
      vs_yesterday_cents: 300
    })).toMatchObject({
      isToday: true,
      today: { salesCount: 2, refundCount: 1, netCents: 1500, averageSaleCents: 1000 },
      week: { thisTotalCents: 10000, lastTotalCents: 9000 },
      activeTerminals: ['T1']
    });
  });
});
