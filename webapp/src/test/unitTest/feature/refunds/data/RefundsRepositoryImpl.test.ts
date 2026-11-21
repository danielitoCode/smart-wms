import { describe, expect, it, vi } from 'vitest';
import { RefundsRepositoryImpl } from '../../../../../core/feature/refunds/data/repository/RefundsRepositoryImpl';
import type { RefundsRemoteDataSource } from '../../../../../core/feature/refunds/data/datasource/RefundsRemoteDataSource';

const header = {
  so_id: 20, so_number: 'SO-20-REFUND-2', customer_name: 'Customer',
  status: 'SHIPPED', created_at: null, order_total: '-5.00',
  order_type: 'refund' as const, parent_so_id: 2, parent_so_number: 'SO-2'
};

describe('RefundsRepositoryImpl', () => {
  it('joins the refund with RMA and partial-refund siblings from the original-order family', async () => {
    const remote = {
      list: vi.fn().mockResolvedValue([header]),
      detail: vi.fn().mockResolvedValue({ sales_order: header, lines: [] }),
      related: vi.fn().mockResolvedValue({
        so_id: 20,
        related_count: 3,
        records: [
          { so_id: 2, so_number: 'SO-2', order_type: 'sale', status: 'REFUNDED', parent_so_id: null, order_total: '20.00', is_voided: false, created_at: null, is_current: false, depth: 0 },
          { so_id: 18, so_number: 'SO-2-RMA', order_type: 'return', status: 'PARTIALLY_RECEIVED', parent_so_id: 2, order_total: null, is_voided: false, created_at: null, is_current: false, depth: 1 },
          { so_id: 19, so_number: 'SO-2-REFUND', order_type: 'refund', status: 'SHIPPED', parent_so_id: 2, order_total: '-7.00', is_voided: false, created_at: null, is_current: false, depth: 1 },
          { so_id: 20, so_number: 'SO-2-REFUND-2', order_type: 'refund', status: 'SHIPPED', parent_so_id: 2, order_total: '-5.00', is_voided: false, created_at: null, is_current: true, depth: 1 }
        ]
      })
    } as unknown as RefundsRemoteDataSource;
    const repository = new RefundsRepositoryImpl(remote);
    const refund = await repository.detail(20, true);
    expect(remote.detail).toHaveBeenCalledWith(20);
    expect(remote.related).toHaveBeenCalledWith(20);
    expect(refund.relatedRecords).toHaveLength(3);
    expect(refund.relatedRecords.map(record => record.orderType)).toEqual(['return', 'refund', 'refund']);
    expect(refund.relatedRecords[0].status).toBe('PARTIALLY_RECEIVED');
    expect(refund.relatedRecords[1].signedAmount).toBe(-7);
  });

  it('does not call the unscoped family endpoint unless explicitly authorized by the caller', async () => {
    const remote = {
      detail: vi.fn().mockResolvedValue({ sales_order: header, lines: [] }),
      related: vi.fn()
    } as unknown as RefundsRemoteDataSource;
    const repository = new RefundsRepositoryImpl(remote);
    const refund = await repository.detail(20);
    expect(remote.related).not.toHaveBeenCalled();
    expect(refund.relatedRecords).toEqual([]);
  });
});
