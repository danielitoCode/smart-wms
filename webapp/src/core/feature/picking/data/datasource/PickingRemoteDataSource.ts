import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ConfirmPickInput, ShortPickInput } from '../../domain/entity/Picking';
import type {
	ActiveBatchDto,
	CreateBatchDto,
	MessageDto,
	PickTaskDto,
	WaveCreateDto,
	WaveValidateDto
} from '../dto/PickingDto';

export class PickingRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	getActiveBatch(warehouseId: number): Promise<ActiveBatchDto> {
		return this.api.get<ActiveBatchDto>(`/api/picking/active-batch?warehouse_id=${warehouseId}`);
	}

	getNextTask(batchId: number): Promise<PickTaskDto> {
		return this.api.get<PickTaskDto>(`/api/picking/batch/${batchId}/next`);
	}

	confirm(input: ConfirmPickInput): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/confirm', {
			pick_task_id: input.pickTaskId,
			warehouse_id: input.warehouseId,
			scanned_barcode: input.scannedBarcode,
			quantity_picked: input.quantityPicked
		});
	}

	short(input: ShortPickInput): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/short', {
			pick_task_id: input.pickTaskId,
			warehouse_id: input.warehouseId,
			quantity_available: input.quantityAvailable
		});
	}

	completeBatch(batchId: number, warehouseId: number): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/complete-batch', {
			batch_id: batchId,
			warehouse_id: warehouseId
		});
	}

	cancelBatch(batchId: number): Promise<MessageDto> {
		return this.api.post<MessageDto>('/api/picking/cancel-batch', {
			batch_id: batchId
		});
	}

	waveValidate(soBarcode: string, warehouseId: number): Promise<WaveValidateDto> {
		return this.api.post<WaveValidateDto>('/api/picking/wave-validate', {
			barcode: soBarcode,
			warehouse_id: warehouseId
		});
	}

	waveCreate(soIds: number[], warehouseId: number): Promise<WaveCreateDto> {
		return this.api.post<WaveCreateDto>('/api/picking/wave-create', {
			so_ids: soIds,
			warehouse_id: warehouseId
		});
	}

	createBatch(soIdentifiers: string[], warehouseId: number): Promise<CreateBatchDto> {
		return this.api.post<CreateBatchDto>('/api/picking/create-batch', {
			so_identifiers: soIdentifiers,
			warehouse_id: warehouseId
		});
	}
}
