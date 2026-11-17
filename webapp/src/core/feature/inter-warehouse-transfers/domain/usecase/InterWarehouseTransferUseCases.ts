import type { InterWarehouseTransfersRepository } from '../repository/InterWarehouseTransfersRepository';
import type { RecordInterWarehouseTransfer } from '../entity/InterWarehouseTransfer';

export type InterWarehouseTransferListFilters = {
  fromWarehouseId?: number; toWarehouseId?: number; limit?: number;
};

export class ListInterWarehouseTransfersUseCase {
  constructor(private readonly repository: InterWarehouseTransfersRepository) {}
  execute(filters: InterWarehouseTransferListFilters = {}) {
    const limit = filters.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('El límite debe estar entre 1 y 500');
    for (const [label, value] of [['origen', filters.fromWarehouseId], ['destino', filters.toWarehouseId]] as const) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) throw new Error('El almacén de ' + label + ' no es válido');
    }
    return this.repository.list(limit, filters);
  }
}

export class CreateInterWarehouseTransferUseCase {
  constructor(private readonly repository: InterWarehouseTransfersRepository) {}
  execute(value: RecordInterWarehouseTransfer) {
    const ids = [value.itemId, value.sourceBinId, value.sourceWarehouseId, value.destinationBinId, value.destinationWarehouseId];
    if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new Error('Los IDs deben ser enteros positivos');
    if (value.sourceWarehouseId === value.destinationWarehouseId) throw new Error('Los almacenes deben ser diferentes');
    if (value.sourceBinId === value.destinationBinId) throw new Error('Las ubicaciones deben ser diferentes');
    if (!Number.isSafeInteger(value.quantity) || value.quantity < 1 || value.quantity > 100000) throw new Error('La cantidad debe ser un entero entre 1 y 100.000');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.idempotencyKey)) throw new Error('La clave de idempotencia no es válida');
    if (value.reason != null && value.reason.length > 200) throw new Error('El motivo no puede superar los 200 caracteres');
    return this.repository.create({ ...value, reason: value.reason?.trim() || null });
  }
}
