/**
 * Domain entities for cycle counting.
 * Contracts mirror POST/GET /api/inventory/cycle-count/* from SentryWMS.
 */

export type CycleCountStatus = 'PENDING' | 'COMPLETED' | 'VARIANCE' | string;

export type CycleCountSummary = {
	countId: number;
	binId: number;
	binCode: string;
	status: CycleCountStatus;
	lines: number;
	assignedTo: string | null;
};

export type CycleCountLine = {
	countLineId: number;
	itemId: number;
	sku: string | null;
	expectedQuantity: number | null;
	countedQuantity: number | null;
};

export type CycleCountDetail = {
	countId: number;
	binId: number;
	binCode: string;
	status: CycleCountStatus;
	lines: CycleCountLine[];
};

export type CycleCountSubmitLine = {
	countLineId: number;
	countedQuantity: number;
	unexpected?: boolean;
	itemId?: number;
};

export type CycleCountVariance = {
	sku: string;
	expected: number;
	counted: number;
	variance: number;
	adjustmentId: number;
};

export type CycleCountSubmitResult = {
	status: CycleCountStatus;
	totalLines: number;
	linesWithVariance: number;
	adjustments: CycleCountVariance[];
};
