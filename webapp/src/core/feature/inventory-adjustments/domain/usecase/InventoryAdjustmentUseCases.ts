import type {
	CreateInventoryAdjustment,
	InventoryAdjustmentDecision
} from '../entity/InventoryAdjustment';
import type {
	AdjustmentListQuery,
	InventoryAdjustmentsRepository
} from '../repository/InventoryAdjustmentsRepository';

function validatePositiveInteger(value: number, label: string): void {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${label} debe ser un entero positivo`);
	}
}

export class ListAdjustmentsUseCase {
	constructor(private readonly repository: InventoryAdjustmentsRepository) {}

	execute(query?: AdjustmentListQuery) {
		if (query?.warehouseId != null) validatePositiveInteger(query.warehouseId, 'Almacén');
		if (query?.page != null) validatePositiveInteger(query.page, 'Página');
		if (query?.perPage != null) validatePositiveInteger(query.perPage, 'Tamaño de página');
		return this.repository.list(query);
	}
}

export class PendingAdjustmentsUseCase {
	constructor(private readonly repository: InventoryAdjustmentsRepository) {}

	execute(query?: Omit<AdjustmentListQuery, 'status'>) {
		if (query?.warehouseId != null) validatePositiveInteger(query.warehouseId, 'Almacén');
		return this.repository.pending(query);
	}
}

export class CreateDirectAdjustmentUseCase {
	constructor(private readonly repository: InventoryAdjustmentsRepository) {}

	execute(input: CreateInventoryAdjustment) {
		validatePositiveInteger(input.itemId, 'Producto');
		validatePositiveInteger(input.binId, 'Ubicación');
		validatePositiveInteger(input.warehouseId, 'Almacén');
		validatePositiveInteger(input.quantity, 'Cantidad');
		if (!input.reason.trim()) throw new Error('El motivo es obligatorio');
		if (input.reason.trim().length > 500) throw new Error('El motivo no puede superar 500 caracteres');
		if (input.type !== 'ADD' && input.type !== 'REMOVE') throw new Error('Tipo de ajuste no válido');
		return this.repository.createDirect({ ...input, reason: input.reason.trim() });
	}
}

export class ReviewAdjustmentsUseCase {
	constructor(private readonly repository: InventoryAdjustmentsRepository) {}

	execute(decisions: InventoryAdjustmentDecision[]) {
		if (!decisions.length) throw new Error('Selecciona al menos un ajuste');
		const ids = decisions.map((decision) => decision.adjustmentId);
		ids.forEach((id) => validatePositiveInteger(id, 'Ajuste'));
		if (new Set(ids).size !== ids.length) throw new Error('No se puede revisar el mismo ajuste más de una vez');
		return this.repository.review(decisions);
	}
}

export class ApproveAdjustmentUseCase {
	constructor(private readonly review: ReviewAdjustmentsUseCase) {}

	execute(adjustmentId: number) {
		return this.review.execute([{ adjustmentId, action: 'approve' }]);
	}
}

export class RejectAdjustmentUseCase {
	constructor(private readonly review: ReviewAdjustmentsUseCase) {}

	execute(adjustmentId: number) {
		return this.review.execute([{ adjustmentId, action: 'reject' }]);
	}
}
