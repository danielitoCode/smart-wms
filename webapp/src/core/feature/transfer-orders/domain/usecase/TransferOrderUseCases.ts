import type { CreateTransferOrder, TransferOrderQuery } from '../entity/TransferOrder';
import type { TransferOrdersRepository } from '../repository/TransferOrdersRepository';

function positiveId(value: number, name: string): void {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} debe ser un entero positivo`);
}
function validateId(id: number, name = 'transferOrderId'): void { positiveId(id, name); }

export class ListTransferOrdersUseCase {
  constructor(private readonly repository: TransferOrdersRepository) {}
  execute(query: TransferOrderQuery = {}) {
    if (query.page != null && (!Number.isInteger(query.page) || query.page < 1)) throw new Error('page debe ser un entero positivo');
    if (query.perPage != null && (!Number.isInteger(query.perPage) || query.perPage < 1 || query.perPage > 1000)) throw new Error('perPage debe estar entre 1 y 1000');
    if (query.sourceWarehouseId != null) positiveId(query.sourceWarehouseId, 'sourceWarehouseId');
    if (query.destinationWarehouseId != null) positiveId(query.destinationWarehouseId, 'destinationWarehouseId');
    return this.repository.list(query);
  }
}
export class ListTransferOrderWarehousesUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute() { return this.repository.warehouses(); } }
export class GetTransferOrderUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number) { validateId(id); return this.repository.detail(id); } }
export class GetPickerTransferOrderUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number) { validateId(id); return this.repository.pickerDetail(id); } }
export class CreateTransferOrderUseCase {
  constructor(private readonly repository: TransferOrdersRepository) {}
  execute(input: CreateTransferOrder) {
    const source = input.sourceWarehouseCode.trim().toLocaleUpperCase();
    const destination = input.destinationWarehouseCode.trim().toLocaleUpperCase();
    if (!source || !destination || source === destination) throw new Error('Origen y destino deben ser almacenes distintos');
    if (!Array.isArray(input.records) || input.records.length === 0) throw new Error('Debe incluir al menos una línea');
    for (const [index, row] of input.records.entries()) {
      if (!row.sku.trim()) throw new Error(`SKU obligatorio en la línea ${index + 1}`);
      if (!Number.isInteger(row.quantity) || row.quantity <= 0 || row.quantity > 1000000) throw new Error(`Cantidad inválida en la línea ${index + 1}`);
    }
    return this.repository.create(input);
  }
}
export class StartTransferOrderPickingUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number) { validateId(id); return this.repository.startPicking(id); } }
export class SubmitPickerResultUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number) { validateId(id); return this.repository.submitPickerResult(id); } }
export class ApproveTransferOrderUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number, approvalId: number) { validateId(id); positiveId(approvalId, 'approvalId'); return this.repository.approve(id, approvalId); } }
export class RejectTransferOrderUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number, approvalId: number, reason: string) { validateId(id); positiveId(approvalId, 'approvalId'); if (reason.length > 1000) throw new Error('El motivo no puede superar 1000 caracteres'); return this.repository.reject(id, approvalId, reason); } }
export class CancelTransferOrderUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number) { validateId(id); return this.repository.cancel(id); } }
export class DeleteTransferOrderUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number) { validateId(id); return this.repository.remove(id); } }
export class ShortCloseTransferOrderLineUseCase { constructor(private readonly repository: TransferOrdersRepository) {} execute(id: number, lineId: number) { validateId(id); positiveId(lineId, 'lineId'); return this.repository.shortClose(id, lineId); } }
