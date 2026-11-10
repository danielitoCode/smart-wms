import type {
	ActiveBatch,
	CreateBatchResult,
	PickTask,
	SimpleMessageResult,
	WaveCreateResult,
	WaveValidateResult
} from '../../domain/entity/Picking';
import type {
	ActiveBatchDto,
	CreateBatchDto,
	MessageDto,
	PickTaskDto,
	WaveCreateDto,
	WaveValidateDto
} from '../dto/PickingDto';

export const PickingMapper = {
	toActiveBatch(dto: ActiveBatchDto): ActiveBatch {
		return {
			active: Boolean(dto.active && dto.batch_id),
			batchId: dto.batch_id ?? null,
			totalPicks: dto.total_picks ?? 0,
			completedPicks: dto.completed_picks ?? 0,
			totalOrders: dto.total_orders ?? 0,
			createdAt: dto.created_at ?? null
		};
	},

	toPickTask(dto: PickTaskDto): PickTask | null {
		if (dto.message && !dto.pick_task_id && !dto.task_id) {
			return null;
		}
		const pickTaskId = dto.pick_task_id ?? dto.task_id;
		if (pickTaskId == null) return null;
		return {
			pickTaskId,
			batchId: dto.batch_id,
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name ?? dto.name ?? '',
			upc: dto.upc ?? null,
			quantityToPick: dto.quantity_to_pick ?? dto.qty_to_pick ?? 0,
			binId: dto.bin_id ?? null,
			binCode: dto.bin_code ?? null,
			status: dto.status ?? 'PENDING'
		};
	},

	toMessage(dto: MessageDto): SimpleMessageResult {
		return { message: dto.message };
	},

	toWaveValidate(dto: WaveValidateDto): WaveValidateResult {
		return {
			valid: dto.valid === true,
			soId: dto.so_id,
			soNumber: dto.so_number,
			lineCount: dto.line_count,
			totalUnits: dto.total_units,
			error: dto.error,
			batchId: dto.batch_id,
			message: dto.message
		};
	},

	toWaveCreate(dto: WaveCreateDto): WaveCreateResult {
		return {
			batchId: dto.batch_id,
			batchStatus: dto.batch_status,
			totalOrders: dto.total_orders,
			totalPicks: dto.total_picks
		};
	},

	toCreateBatch(dto: CreateBatchDto): CreateBatchResult {
		return {
			batchId: dto.batch_id,
			batchNumber: dto.batch_number ?? `BATCH-${dto.batch_id}`,
			totalOrders: dto.total_orders ?? dto.orders?.length ?? 0,
			totalItems: dto.total_items ?? dto.tasks?.length ?? 0,
			tasks: (dto.tasks ?? []).map((t) => ({
				pickTaskId: t.pick_task_id,
				sku: t.sku,
				pickSequence: t.pick_sequence
			})),
			orders: (dto.orders ?? []).map((o) => ({
				soId: o.so_id,
				soNumber: o.so_number,
				toteNumber: o.tote_number
			}))
		};
	}
};
