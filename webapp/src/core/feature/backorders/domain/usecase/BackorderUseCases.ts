import type {
  Backorder, BackorderAuditHistoryPage, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../entity/Backorder';
import type { BackordersRepository } from '../repository/BackordersRepository';

const CANCELLABLE_BACKORDER_STATUSES = ['WAITING_STOCK', 'OPEN', 'PICKED', 'PACKED'] as const;

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
      const { order } = detail;
      if (order.orderType !== 'backorder' && !order.backorderOpenedAt) {
        throw new Error('El pedido indicado no pertenece a la cola de backorders');
      }
      if (order.parentSoId === null && detail.parentSalesOrder !== null) {
        throw new Error('La relación con el pedido original no coincide con el detalle del backorder');
      }
      if (order.parentSoId !== null && detail.parentSalesOrder?.salesOrderId !== order.parentSoId) {
        throw new Error('No se pudo resolver el pedido original del backorder');
      }
      return detail;
    });
  }
}

export class GetBackorderAuditHistoryUseCase {
  constructor(private readonly repository: BackordersRepository) {}

  execute(backorderId: number, page = 1): Promise<BackorderAuditHistoryPage> {
    if (!Number.isSafeInteger(backorderId) || backorderId <= 0) {
      throw new Error('Pedido no válido');
    }
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('Página de historial no válida');
    return this.repository.auditHistory(backorderId, page);
  }
}

export class CancelBackorderUseCase {
  constructor(private readonly repository: BackordersRepository) {}

  async execute(backorderId: number, reason: CancelBackorderReason, expectedWarehouseId: number): Promise<void> {
    if (!Number.isInteger(backorderId) || backorderId < 1) {
      throw new Error('backorderId must be an integer >= 1');
    }
    const allowed: readonly CancelBackorderReason[] = ['found', 'customer_asked', 'refunded', 'other'];
    if (!allowed.includes(reason)) throw new Error('Motivo de cancelación no válido');

    if (!Number.isSafeInteger(expectedWarehouseId) || expectedWarehouseId <= 0) {
      throw new Error('Selecciona un almacén autorizado antes de cancelar');
    }
    const detail = await this.repository.getDetail(backorderId);
    const { order } = detail;
    if (order.warehouseId !== expectedWarehouseId) {
      throw new Error('El backorder no pertenece al almacén autorizado seleccionado');
    }
    if (order.orderType !== 'backorder' || order.parentSoId === null) {
      throw new Error('Este pedido no es un backorder cancelable mediante esta operación');
    }
    if (!detail.parentSalesOrder || detail.parentSalesOrder.salesOrderId !== order.parentSoId) {
      throw new Error('No se pudo verificar el pedido original del backorder');
    }
    if (detail.parentSalesOrder.status === 'CANCELLED') {
      throw new Error('No se puede cancelar el backorder porque el pedido original ya está cancelado');
    }
    if (!(CANCELLABLE_BACKORDER_STATUSES as readonly string[]).includes(order.status)) {
      throw new Error('No se puede cancelar un backorder en estado ' + order.status);
    }
    await this.repository.cancel(backorderId, reason);
  }
}
