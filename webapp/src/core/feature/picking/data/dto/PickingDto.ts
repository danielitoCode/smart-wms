export type ActiveBatchDto = {
	active?: boolean;
	batch_id?: number | null;
	total_picks?: number;
	completed_picks?: number;
	total_orders?: number;
	created_at?: string | null;
	message?: string;
};

export type PickTaskDto = {
	pick_task_id?: number;
	task_id?: number;
	batch_id: number;
	item_id: number;
	sku: string;
	item_name?: string;
	name?: string;
	upc?: string | null;
	quantity_to_pick?: number;
	qty_to_pick?: number;
	bin_id?: number | null;
	bin_code?: string | null;
	status?: string;
	message?: string;
	pick_sequence?: number;
};

export type MessageDto = {
	message: string;
};

/** Matches test_wave_picking.py wave-validate bodies. */
export type WaveValidateDto = {
	valid?: boolean;
	so_id?: number;
	so_number?: string;
	line_count?: number;
	total_units?: number;
	error?: string;
	batch_id?: number;
	message?: string;
};

export type WaveCreateDto = {
	batch_id: number;
	batch_status: string;
	total_orders: number;
	total_picks: number;
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
