import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ConfirmPickInput, ShortPickInput } from '../../domain/entity/Picking';
import type { ActiveBatchDto, MessageDto, PickTaskDto } from '../dto/PickingDto';

export class PickingRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	getActiveBatch(): Promise<ActiveBatchDto> {
		return this.api.get<ActiveBatchDto>('/api/picking/active-batch');
	}

	getNextTask(batchId: number): Promise<PickTaskDto> {
		return this.api.get<PickTaskDto>(`/api/picking/batch/${batchId}/next`);
	}

	confirm(input: ConfirmPickInput): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/confirm', {
			pick_task_id: input.pickTaskId,
			scanned_barcode: input.scannedBarcode,
			quantity_picked: input.quantityPicked
		});
	}

	short(input: ShortPickInput): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/short', {
			pick_task_id: input.pickTaskId,
			quantity_available: input.quantityAvailable
		});
	}

	completeBatch(batchId: number): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/complete-batch', {
			batch_id: batchId
		});
	}

	cancelBatch(batchId: number): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/cancel-batch', {
			batch_id: batchId
		});
	}
}
