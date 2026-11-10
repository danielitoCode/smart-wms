import type {
	ActiveBatch,
	ConfirmPickInput,
	PickTask,
	ShortPickInput,
	SimpleMessageResult,
	WaveCreateResult,
	WaveValidateResult
} from '../entity/Picking';

export interface PickingRepository {
	getActiveBatch(): Promise<ActiveBatch>;
	getNextTask(batchId: number): Promise<PickTask | null>;
	confirm(input: ConfirmPickInput): Promise<SimpleMessageResult>;
	short(input: ShortPickInput): Promise<SimpleMessageResult>;
	completeBatch(batchId: number): Promise<SimpleMessageResult>;
	cancelBatch(batchId: number): Promise<SimpleMessageResult>;
	/** POST /api/picking/wave-validate */
	waveValidate(soBarcode: string, warehouseId: number): Promise<WaveValidateResult>;
	/** POST /api/picking/wave-create */
	waveCreate(soIds: number[], warehouseId: number): Promise<WaveCreateResult>;
}
