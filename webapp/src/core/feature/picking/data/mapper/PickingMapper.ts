import type {
	ActiveBatch,
	PickTask,
	SimpleMessageResult,
	WaveCreateResult,
	WaveValidateResult
} from '../../domain/entity/Picking';
import type {
	ActiveBatchDto,
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
			message: dto.message ?? 'ok',
			soId: dto.so_id,
			soNumber: dto.so_number
		};
	},

	toWaveCreate(dto: WaveCreateDto): WaveCreateResult {
		return {
			batchId: dto.batch_id,
			batchStatus: dto.batch_status,
			totalOrders: dto.total_orders,
			totalPicks: dto.total_picks
		};
	}
};
