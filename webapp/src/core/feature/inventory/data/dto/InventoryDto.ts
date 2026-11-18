export type InventoryRowDto = {
	inventory_id: number;
	item_id: number;
	sku: string;
	item_name: string;
	bin_id: number;
	bin_code: string;
	warehouse_id?: number;
	zone_name: string | null;
	quantity_on_hand: number;
	quantity_allocated: number;
	quantity_available: number;
	committed_to_orders: number;
	lot_number: string | null;
	last_counted_at: string | null;
};

export type InventoryOverviewDto = {
	inventory: InventoryRowDto[];
	total: number;
	page: number;
	per_page: number;
	pages: number;
};

export type CycleCountSummaryDto = {
	count_id: number;
	bin_id: number;
	bin_code: string;
	status: string;
	lines: number;
	assigned_to: string | null;
};

export type CreateCycleCountResponseDto = {
	message: string;
	counts: CycleCountSummaryDto[];
};

export type CycleCountLineDto = {
	count_line_id: number;
	item_id: number;
	sku: string;
	item_name: string;
	upc: string | null;
	expected_quantity: number;
	counted_quantity: number | null;
	variance: number | null;
	scanned: boolean;
	unexpected: boolean;
};

export type CycleCountHeaderDto = {
	count_id: number;
	bin_id: number;
	bin_code: string;
	bin_barcode: string | null;
	warehouse_id: number;
	status: string;
	assigned_to: string | null;
	created_at: string | null;
};

export type CycleCountDetailDto = {
	cycle_count: CycleCountHeaderDto;
	show_expected: boolean;
	lines: CycleCountLineDto[];
};

export type CycleCountSubmitLineDto =
	| {
			count_line_id: number;
			counted_quantity: number;
		}
	| {
			unexpected: true;
			item_id: number;
			sku?: string;
			counted_quantity: number;
		};

export type CycleCountSubmitResponseDto = {
	message: string;
	count_id: number;
	bin_code: string;
	status: string;
	summary: {
		total_lines: number;
		lines_matched: number;
		lines_with_variance: number;
		adjustments: Array<{
			sku: string;
			expected: number;
			counted: number;
			variance: number;
			adjustment_id: number;
			unexpected?: boolean;
		}>;
	};
};
