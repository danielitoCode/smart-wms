import type { InterWarehouseTransfersRepository } from '../repository/InterWarehouseTransfersRepository';
import type { RecordInterWarehouseTransfer } from '../entity/InterWarehouseTransfer';

export type InterWarehouseTransferListFilters = {
  fromWarehouseId?: number;
  toWarehouseId?: number;
  limit?: number;
};

export class ListInterWarehouseTransfersUseCase {
  constructor(private readonly repository: InterWarehouseTransfersRepository) {}

  execute(filters: InterWarehouseTransferListFilters = {}) {
    const limit = filters.limit ?? 100;
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new Error('El límite debe estar entre 1 y 500');
    }
    for (const [label, value] of [
      ['almacén de origen', filters.fromWarehouseId],
      ['almacén de destino', filters.toWarehouseId]
    ] as const) {
      if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        throw new Error('El filtro de ' + label + ' debe ser un ID válido');
      }
    }
    return this.repository.list(limit).then(rows => rows.filter(row =>
      (filters.fromWarehouseId === undefined || row.sourceWarehouseId === filters.fromWarehouseId) &&
      (filters.toWarehouseId === undefined || row.destinationWarehouseId === filters.toWarehouseId)
    ));
  }
}

export class CreateInterWarehouseTransferUseCase {
  constructor(private readonly repository: InterWarehouseTransfersRepository) {}

  execute(value: RecordInterWarehouseTransfer) {
    const positiveIds = [
      value.itemId, value.sourceBinId, value.sourceWarehouseId,
      value.destinationBinId, value.destinationWarehouseId
    ];
    if (positiveIds.some(id => !Number.isSafeInteger(id) || id <= 0)) {
      throw new Error('Los IDs de producto, almacenes y ubicaciones deben ser enteros positivos');
    }
    if (value.sourceWarehouseId === value.destinationWarehouseId) {
      throw new Error('El almacén de origen y destino deben ser diferentes');
    }
    if (!Number.isSafeInteger(value.quantity) || value.quantity < 1 || value.quantity > 100000) {
      throw new Error('La cantidad debe ser un entero entre 1 y 100.000');
    }
    if (value.reason != null && value.reason.length > 500) {
      throw new Error('El motivo no puede superar los 500 caracteres');
    }
    return this.repository.create({ ...value, reason: value.reason?.trim() || null });
  }
}
