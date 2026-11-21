/**
 * R6 picking execution gates derived from the Flask transaction contract.
 *
 * Reads and wave planning remain available. Confirm/short/complete stay
 * blocked until Flask serializes task transitions, validates the source bin
 * and makes batch completion idempotent across operators.
 */
export type R6PickingCapabilityStatus = 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED_BY_SERVER';

export const R6_PICKING_CAPABILITIES = {
	listEligibleOrders: 'PARTIAL',
	createWave: 'PARTIAL',
	getNextPickTask: 'SUPPORTED',
	validateItemBarcode: 'SUPPORTED',
	validateBinBarcodeAtomically: 'NOT_SUPPORTED_BY_SERVER',
	confirmPickAtomically: 'NOT_SUPPORTED_BY_SERVER',
	shortPickAtomically: 'NOT_SUPPORTED_BY_SERVER',
	completePickingIdempotently: 'NOT_SUPPORTED_BY_SERVER'
} as const satisfies Record<string, R6PickingCapabilityStatus>;

export class R6PickingCapabilityError extends Error {
	readonly code = 'NOT_SUPPORTED_BY_SERVER';

	constructor(operation: keyof typeof R6_PICKING_CAPABILITIES) {
		super(`No se puede ejecutar ${operation}: Flask todavía no garantiza la transición atómica requerida para R6.`);
		this.name = 'R6PickingCapabilityError';
	}
}

export function isR6PickingExecutionAvailable(): boolean {
	return R6_PICKING_CAPABILITIES.confirmPickAtomically === 'SUPPORTED'
		&& R6_PICKING_CAPABILITIES.shortPickAtomically === 'SUPPORTED'
		&& R6_PICKING_CAPABILITIES.completePickingIdempotently === 'SUPPORTED'
		&& R6_PICKING_CAPABILITIES.validateBinBarcodeAtomically === 'SUPPORTED';
}
