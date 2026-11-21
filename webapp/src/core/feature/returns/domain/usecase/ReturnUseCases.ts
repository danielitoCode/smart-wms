import type { ReturnsRepository } from '../repository/ReturnsRepository';
import type { RequestedReturnLine } from '../policy/ReturnQuantityPolicy';
import { validateReturnRequest } from '../policy/ReturnQuantityPolicy';
import { ReturnCapabilityNotSupportedError } from '../contract/ReturnLifecycleContract';

export class ListReturnsUseCase { constructor(private r: ReturnsRepository) {} execute(q?: { status?: string; search?: string }) { return this.r.list(q); } }
export class SearchReturnableOrdersUseCase { constructor(private r: ReturnsRepository) {} execute(search = '') { return this.r.originals(search); } }
export class GetReturnableOrderUseCase { constructor(private r: ReturnsRepository) {} execute(id: number) { if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de pedido original no válido'); return this.r.returnableOrder(id); } }
export class CreateReturnUseCase {
  constructor(private r: ReturnsRepository) {}
  execute(id: number, value: { lines: RequestedReturnLine[]; memo?: string | null }, available: Awaited<ReturnType<ReturnsRepository['returnableOrder']>>) {
    if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de pedido original no válido');
    if (available.salesOrderId !== id || available.status !== 'SHIPPED') throw new Error('El pedido original no está disponible para autorizar devoluciones');
    const validation = validateReturnRequest(available.lines, value.lines);
    if (!validation.valid) throw new Error(validation.reason ?? 'Solicitud RMA no válida');
    return this.r.createReturn(id, { lines: value.lines, memo: value.memo?.trim() || null });
  }
}
export class ApproveRMAUseCase { execute(): never { throw new ReturnCapabilityNotSupportedError('approveRma'); } }
export class ClassifyReturnedItemUseCase { execute(): never { throw new ReturnCapabilityNotSupportedError('classifyReturnedItem'); } }
export class RestockReturnUseCase { execute(): never { throw new ReturnCapabilityNotSupportedError('restockReturn'); } }
export class GetReturnDetailUseCase { constructor(private r: ReturnsRepository) {} execute(id: number, includeReceipts = false) { if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de RMA no válido'); return this.r.detail(id, includeReceipts); } }
export class SaveReturnMemoUseCase { constructor(private r: ReturnsRepository) {} execute(id: number, memo: string) { if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de RMA no válido'); if (memo.length > 4000) throw new Error('La nota supera los 4000 caracteres'); return this.r.saveMemo(id, memo); } }
export class ReceiveReturnLineUseCase { constructor(private r: ReturnsRepository) {} execute(id: number, v: { itemId: number; quantity: number; warehouseId: number; binId: number; notes?: string | null; idempotencyKey: string }) { if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(v.itemId) || v.itemId <= 0 || !Number.isInteger(v.quantity) || v.quantity <= 0 || !Number.isInteger(v.warehouseId) || v.warehouseId <= 0 || !Number.isInteger(v.binId) || v.binId <= 0 || !v.idempotencyKey.trim()) throw new Error('Datos de recepción no válidos'); return this.r.receive(id, v); } }
export class VoidReturnUseCase { constructor(private r: ReturnsRepository) {} execute(id: number) { if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de RMA no válido'); return this.r.void(id); } }
export class ListReturnWarehousesUseCase { constructor(private r: ReturnsRepository) {} execute() { return this.r.warehouses(); } }
export class SearchReturnBinsUseCase { constructor(private r: ReturnsRepository) {} execute(id: number, q: string) { if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de almacén no válido'); if (q.trim().length < 1) return Promise.resolve([]); return this.r.bins(id, q.trim()); } }
export class ListReturnReceiptsUseCase { constructor(private r: ReturnsRepository) {} execute(id: number) { if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de RMA no válido'); return this.r.receipts(id); } }
