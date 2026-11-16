import type {
  Backorder, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../entity/Backorder';
import type { BackordersRepository } from '../repository/BackordersRepository';

export class ListBackordersUseCase {
  constructor(private readonly repository: BackordersRepository) {}

  execute(warehouseId: number | null, tab: BackorderQueueTab): Promise<Backorder[]> {
    if (warehouseId !== null && (!Number.isInteger(warehouseId) || warehouseId < 1)) {
      throw new Error('warehouseId must be null or an integer >= 1');
    }
    if (tab !== 'waiting' && tab !== 'ready-to-ship') {
      throw new Error('La cola de pedidos pendientes no es válida');
    }
    return this.repository.list(warehouseId, tab);
  }
}

export class GetBackorderDetailUseCase {
  constructor(private readonly repository: BackordersRepository) {}

  execute(backorderId: number): Promise<BackorderDetail> {
    if (!Number.isInteger(backorderId) || backorderId < 1) {
      throw new Error('backorderId must be an integer >= 1');
    }
    return this.repository.getDetail(backorderId).then((detail) => {
      if (detail.order.orderType !== 'backorder' && detail.order.backorderOpenedAt === null) {
        throw new Error('El pedido indicado no pertenece a la cola de backorders');
      }
      return detail;
    });
  }
}

export class CancelBackorderUseCase {
  constructor(private readonly repository: BackordersRepository) {}

  async execute(backorderId: number, reason: CancelBackorderReason): Promise<void> {
    if (!Number.isInteger(backorderId) || backorderId < 1) {
      throw new Error('backorderId must be an integer >= 1');
    }
    const allowed: readonly CancelBackorderReason[] = ['found', 'customer_asked', 'refunded', 'other'];
    if (!allowed.includes(reason)) throw new Error('Motivo de cancelación no válido');

    const detail = await this.repository.getDetail(backorderId);
    const order = detail.order;
    if (order.orderType !== 'backorder' || order.parentSoId === null) {
      throw new Error('Este pedido no es un backorder cancelable mediante esta operación');
    }
    if (['CANCELLED', 'REFUNDED', 'SHIPPED'].includes(order.status)) {
      throw new Error('No se puede cancelar un backorder en estado ' + order.status);
    }
    await this.repository.cancel(backorderId, reason);
  }
}
