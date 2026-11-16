import type {
  Backorder, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../../domain/entity/Backorder';
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
    const relatedOrders = await this.salesOrders.related(backorderId);
    const parentSalesOrder = order.parentSoId === null
      ? null
      : relatedOrders.find((related) => related.soId === order.parentSoId) ?? null;
    return { order, parentSalesOrder };
  }

  async cancel(backorderId: number, reason: CancelBackorderReason): Promise<void> {
    await this.remote.cancel(backorderId, reason);
  }
}
