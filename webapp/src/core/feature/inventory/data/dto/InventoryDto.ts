/**
 * DTOs mirror backend JSON shapes (snake_case).
 * Admin inventory list responses may vary by version; fields are optional where docs are incomplete.
 */

export type InventoryRowDto = {
	inventory_id?: number;
	id?: number;
	item_id: number;
	bin_id: number;
	warehouse_id: number;
	quantity_on_hand: number;
	lot_number?: string | null;
	sku?: string | null;
	item_name?: string | null;
	bin_code?: string | null;
};

export type InventoryOverviewDto = {
	inventory?: InventoryRowDto[];
	items?: InventoryRowDto[];
	data?: InventoryRowDto[];
};

export type CycleCountSummaryDto = {
	count_id: number;
	bin_id: number;
	bin_code: string;
	status: string;
	lines: number;
	assigned_to?: string | null;
};

export type CreateCycleCountResponseDto = {
	counts: CycleCountSummaryDto[];
};

export type CycleCountLineDto = {
	count_line_id: number;
	item_id: number;
	sku?: string | null;
	expected_quantity?: number | null;
	counted_quantity?: number | null;
};

export type CycleCountDetailDto = {
	count_id: number;
	bin_id: number;
	bin_code: string;
	status: string;
	lines: CycleCountLineDto[];
};

export type CycleCountSubmitResponseDto = {
	status: string;
	summary: {
		total_lines: number;
		lines_with_variance: number;
		adjustments: Array<{
			sku: string;
			expected: number;
			counted: number;
			variance: number;
			adjustment_id: number;
		}>;
	};
};
