import type {
  Backorder, BackorderAuditHistoryPage, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../../domain/entity/Backorder';
import { projectBackorderLineProgress } from '../../domain/entity/Backorder';
import type { BackordersRepository } from '../../domain/repository/BackordersRepository';
import type { BackordersRemoteDataSource } from '../datasource/BackordersRemoteDataSource';
import type { SalesOrderRepository } from '../../../sales-orders/domain/repository/SalesOrderRepository';
import { BackorderMapper } from '../mapper/BackorderMapper';

export class BackordersRepositoryImpl implements BackordersRepository {
  constructor(
    private readonly remote: BackordersRemoteDataSource,
    private readonly salesOrders: SalesOrderRepository
  ) {}

  async list(warehouseId: number | null, tab: BackorderQueueTab): Promise<Backorder[]> {
    const rows = await this.remote.list(warehouseId, tab);
    return rows.map(BackorderMapper.toDomain);
  }

  async getDetail(backorderId: number): Promise<BackorderDetail> {
    const order = await this.salesOrders.getById(backorderId);
    const parentSalesOrder = order.parentSoId === null
      ? null
      : await this.salesOrders.getById(order.parentSoId);
    const lines = order.lines.map(projectBackorderLineProgress);
    return {
      order,
      parentSalesOrder,
      lines,
      totalQuantityPending: lines.reduce((total, line) => total + line.quantityPending, 0),
      totalQuantityResolved: lines.reduce((total, line) => total + line.quantityResolved, 0)
    };
  }

  async auditHistory(backorderId: number, page: number): Promise<BackorderAuditHistoryPage> {
    const result = await this.remote.auditHistory(backorderId, page);
    return {
      entries: (result.entries ?? []).map((entry) => ({
        logId: entry.log_id,
        actionType: entry.action_type,
        username: entry.username,
        warehouseId: entry.warehouse_id,
        details: entry.details,
        createdAt: entry.created_at
      })),
      page: result.page,
      perPage: result.per_page,
      total: result.total,
      pages: result.pages
    };
  }

  async cancel(backorderId: number, reason: CancelBackorderReason): Promise<void> {
    await this.remote.cancel(backorderId, reason);
  }
}
