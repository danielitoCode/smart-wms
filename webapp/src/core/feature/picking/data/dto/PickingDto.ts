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
};

export type MessageDto = {
	message: string;
};

export type WaveValidateDto = {
	message?: string;
	so_id?: number;
	so_number?: string;
};

export type WaveCreateDto = {
	batch_id: number;
	batch_status: string;
	total_orders: number;
	total_picks: number;
};
