export type ActiveBatchDto = {
	active?: boolean;
	batch_id?: number | null;
	warehouse_id?: number | null;
	kind?: 'SO' | 'TO' | null;
	to_id?: number | null;
	to_number?: string | null;
	total_picks?: number;
	completed_picks?: number;
	total_orders?: number;
	created_at?: string | null;
	message?: string;
};

export type PickTaskDto = {
	pick_task_id?: number;
	task_id?: number;
	batch_id?: number;
	item_id?: number;
	sku?: string;
	item_name?: string;
	name?: string;
	upc?: string | null;
	quantity_to_pick?: number;
	quantity_picked?: number;
	qty_to_pick?: number;
	bin_id?: number | null;
	bin_code?: string | null;
	status?: string;
	message?: string;
	pick_sequence?: number;
	bin_barcode?: string | null;
	zone?: string | null;
	aisle?: string | null;
	row_num?: string | number | null;
	level_num?: string | number | null;
	tote_number?: string | null;
	so_number?: string | null;
	to_number?: string | null;
	pick_number?: number;
	total_picks?: number;
	contributing_orders?: Array<{ so_number: string; quantity: number }>;
};

export type MessageDto = {
	message: string;
	task?: {
		pick_task_id: number;
		status: string;
		sku: string;
		quantity_picked?: number;
		quantity_to_pick?: number;
		shortage?: number;
		bin_code?: string;
		tote_number?: string | null;
	};
	remaining_tasks?: number;
	batch_id?: number;
	batch_number?: string;
	summary?: {
		total_orders: number;
		total_items_picked: number;
		total_shorts: number;
		orders: Array<{ so_number: string; status: string }>;
	};
	released_tasks?: number;
};

/** Matches test_wave_picking.py wave-validate bodies. */
export type WaveValidateDto = {
	valid?: boolean;
	kind?: 'SO' | 'TO';
	to_id?: number;
	to_number?: string;
	batch_number?: string;
	assigned_to?: string;
	to_status?: string;
	so_id?: number;
	so_number?: string;
	line_count?: number;
	total_units?: number;
	error?: string;
	batch_id?: number;
	message?: string;
	status_code?: number;
};

export type WaveCreateDto = {
	batch_id: number;
	batch_number: string;
	total_orders: number;
	total_picks: number;
	total_units: number;
	orders: Array<{ so_id: number; so_number: string; line_count: number }>;
	first_pick?: PickTaskDto | null;
	warnings?: string[];
};

/** Matches TestCreateBatch in test_picking.py. */
export type CreateBatchDto = {
	batch_id: number;
	batch_number?: string;
	total_orders?: number;
	total_items?: number;
	tasks?: Array<{
		pick_task_id?: number;
		sku?: string;
		pick_sequence?: number;
	}>;
	orders?: Array<{
		so_id?: number;
		so_number?: string;
		tote_number?: string;
	}>;
};
