import type { InventoryAdjustmentStatus } from '../entity/InventoryAdjustment';

export type AdjustmentReviewAction = 'approve' | 'reject';

/**
 * Approval transition rules shared by the UI and use cases.
 * Inventory mutations remain server-authoritative and are guarded again by
 * the locked Flask transaction.
 */
export const AdjustmentApprovalPolicy = {
	canTransition(status: InventoryAdjustmentStatus, _action: AdjustmentReviewAction): boolean {
		return status === 'PENDING';
	},

	assertTransition(status: InventoryAdjustmentStatus, action: AdjustmentReviewAction): void {
		if (!this.canTransition(status, action)) {
			throw new Error('El ajuste ya fue revisado y no admite otra decisión');
		}
	},

	validateRejectionReason(reason: string): string {
		const normalized = reason.trim();
		if (!normalized) throw new Error('El motivo de rechazo es obligatorio');
		if (normalized.length > 500) {
			throw new Error('El motivo de rechazo no puede superar 500 caracteres');
		}
		return normalized;
	},

	/**
	 * Evaluates a tolerance supplied by an explicit configuration source.
	 * There is intentionally no implicit/default tolerance: no cycle-count
	 * tolerance setting is currently defined by the backend contract.
	 */
	isWithinTolerance(expected: number, counted: number, tolerance: number): boolean {
		if (!Number.isFinite(expected) || !Number.isFinite(counted)) {
			throw new Error('Las cantidades deben ser números finitos');
		}
		if (!Number.isFinite(tolerance) || tolerance < 0) {
			throw new Error('La tolerancia debe ser un número finito no negativo');
		}
		return Math.abs(counted - expected) <= tolerance;
	}
};
