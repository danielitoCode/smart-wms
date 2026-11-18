import { describe, expect, it } from 'vitest';
import { RefundMapper } from '../../../../../core/feature/refunds/data/mapper/RefundMapper';
import type { RefundHeaderDto } from '../../../../../core/feature/refunds/data/dto/RefundDto';

const header: RefundHeaderDto = {
  so_id: 9, so_number: 'SO-9-REFUND', customer_name: 'Customer',
  status: 'SHIPPED', created_at: '2026-11-01T10:00:00Z',
  order_total: '-12.50', order_type: 'refund', parent_so_id: 3,
  parent_so_number: 'SO-3'
};

describe('RefundMapper', () => {
  it('exposes a positive display amount and preserves the negative credit ledger value', () => {
    const refund = RefundMapper.header(header);
    expect(refund.orderTotal).toBe(12.5);
    expect(refund.signedAmount).toBe(-12.5);
    expect(refund.amountIntegrity).toBe('VALID');
    expect(refund.parentSalesOrderNumber).toBe('SO-3');
  });

  it('flags non-negative or missing credit amounts instead of silently treating them as valid', () => {
    expect(RefundMapper.header({ ...header, order_total: '12.50' }).amountIntegrity).toBe('NON_NEGATIVE');
    const lineMismatch = RefundMapper.header({ ...header, order_total: '-12.50' }, [{
      so_line_id: 1, line_number: 1, item_id: 4, sku: 'SKU-4', item_name: 'Item',
      quantity_ordered: 2, status: 'SHIPPED'
    }]);
    expect(lineMismatch.amountIntegrity).toBe('LINE_SIGN_MISMATCH');
    const missing = RefundMapper.header({ ...header, order_total: null });
    expect(missing.amountIntegrity).toBe('MISSING');
    expect(missing.signedAmount).toBeNull();
  });

  it('preserves RMA siblings and signed amounts for family reconciliation', () => {
    const refund = RefundMapper.header(header, [], [{
      salesOrderId: 10, salesOrderNumber: 'SO-3-RMA', orderType: 'return',
      status: 'PARTIALLY_RECEIVED', parentSalesOrderId: 3, isVoided: false,
      createdAt: null, signedAmount: null
    }]);
    expect(refund.relatedRecords).toHaveLength(1);
    expect(refund.relatedRecords[0]).toMatchObject({
      salesOrderNumber: 'SO-3-RMA', status: 'PARTIALLY_RECEIVED'
    });
  });
});
