import type {
	CreateInventoryAdjustment,
	InventoryAdjustmentDecision
} from '../entity/InventoryAdjustment';
import { AdjustmentApprovalPolicy } from '../policy/AdjustmentApprovalPolicy';
import type {
	AdjustmentListQuery,
	InventoryAdjustmentsRepository
} from '../repository/InventoryAdjustmentsRepository';

function validatePositiveInteger(value: number, label: string): void {
	if (!Number.isSafeInteger(value) || value <= 0) {
		throw new Error(`${label} debe ser un entero positivo`);
	}
}

export class GetAdjustmentDetailUseCase {
	constructor(private readonly repository: InventoryAdjustmentsRepository) {}

	async execute(adjustmentId: number, warehouseId?: number | null) {
		validatePositiveInteger(adjustmentId, 'Ajuste');
		if (warehouseId != null) validatePositiveInteger(warehouseId, 'Almacén');
		const rows = await this.repository.list({
			adjustmentId,
			warehouseId: warehouseId ?? null,
			page: 1,
			perPage: 1
		});
		return rows[0] ?? null;
	}
}

export class ListAdjustmentsUseCase {
	constructor(private readonly repository: InventoryAdjustmentsRepository) {}

	execute(query?: AdjustmentListQuery) {
		if (query?.warehouseId != null) validatePositiveInteger(query.warehouseId, 'Almacén');
		if (query?.page != null) validatePositiveInteger(query.page, 'Página');
		if (query?.perPage != null) validatePositiveInteger(query.perPage, 'Tamaño de página');
		if (query?.adjustmentId != null) validatePositiveInteger(query.adjustmentId, 'Ajuste');
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
		for (const decision of decisions) {
			if (decision.action === 'reject') {
				AdjustmentApprovalPolicy.validateRejectionReason(decision.rejectionReason ?? '');
			}
		}
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

	execute(adjustmentId: number, rejectionReason: string) {
		return this.review.execute([{ adjustmentId, action: 'reject', rejectionReason }]);
	}
}
