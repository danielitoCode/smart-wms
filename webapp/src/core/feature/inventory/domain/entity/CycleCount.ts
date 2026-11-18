/**
 * Domain model for the cycle-count workflow.
 * Field semantics mirror the Flask inventory endpoints and schemas.
 */

export type CycleCountStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'VARIANCE';

export const SUBMITTABLE_CYCLE_COUNT_STATUSES: readonly CycleCountStatus[] = [
	'PENDING',
	'IN_PROGRESS'
];

export function canSubmitCycleCount(status: CycleCountStatus): boolean {
	return SUBMITTABLE_CYCLE_COUNT_STATUSES.includes(status);
}

export type CycleCountSummary = {
	countId: number;
	warehouseId: number;
	binId: number;
	binCode: string;
	status: CycleCountStatus;
	lineCount: number;
	assignedTo: string | null;
};

export type CycleCountLine = {
	countLineId: number;
	itemId: number;
	sku: string;
	itemName: string;
	upc: string | null;
	expectedQuantity: number;
	countedQuantity: number | null;
	variance: number | null;
	scanned: boolean;
	unexpected: boolean;
};

export type CycleCountDetail = {
	countId: number;
	warehouseId: number;
	binId: number;
	binCode: string;
	binBarcode: string | null;
	status: CycleCountStatus;
	assignedTo: string | null;
	createdAt: string | null;
	showExpected: boolean;
	lines: CycleCountLine[];
};

export type CycleCountSubmitLine =
	| {
			countLineId: number;
			countedQuantity: number;
			expected?: false;
	  }
	| {
			unexpected: true;
			itemId: number;
			sku?: string;
			countedQuantity: number;
	  };

export type CycleCountVariance = {
	sku: string;
	expected: number;
	counted: number;
	variance: number;
	adjustmentId: number;
	unexpected: boolean;
};

export type CycleCountSubmitResult = {
	countId: number;
	binCode: string;
	status: CycleCountStatus;
	totalLines: number;
	linesMatched: number;
	linesWithVariance: number;
	adjustments: CycleCountVariance[];
};
