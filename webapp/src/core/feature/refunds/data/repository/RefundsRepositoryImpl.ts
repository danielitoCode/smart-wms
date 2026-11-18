import type { Refund, RefundRelatedRecord } from '../../domain/entity/Refund';
import type { RefundsRepository } from '../../domain/repository/RefundsRepository';
import type { RefundsRemoteDataSource } from '../datasource/RefundsRemoteDataSource';
import { RefundMapper } from '../mapper/RefundMapper';

export class RefundsRepositoryImpl implements RefundsRepository {
  constructor(private remote: RefundsRemoteDataSource) {}

  async list(query?: { status?: string; search?: string }): Promise<Refund[]> {
    return (await this.remote.list(query)).map(dto => RefundMapper.header(dto));
  }

  async detail(id: number): Promise<Refund> {
    const [detail, family] = await Promise.all([
      this.remote.detail(id),
      this.remote.related(id)
    ]);
    const related: RefundRelatedRecord[] = family.records
      .filter(record => record.order_type === 'return' || record.order_type === 'refund')
      .map(record => ({
        salesOrderId: record.so_id,
        salesOrderNumber: record.so_number,
        orderType: record.order_type,
        status: record.status,
        parentSalesOrderId: record.parent_so_id,
        isVoided: record.is_voided,
        createdAt: record.created_at,
        signedAmount: record.order_total == null || !Number.isFinite(Number(record.order_total))
          ? null : Number(record.order_total)
      }));
    return RefundMapper.header(detail.sales_order, detail.lines, related);
  }
}
