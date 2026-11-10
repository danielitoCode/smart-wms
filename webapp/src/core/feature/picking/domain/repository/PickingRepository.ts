import type {
	ActiveBatch,
	ConfirmPickInput,
	PickTask,
	ShortPickInput,
	SimpleMessageResult
} from '../entity/Picking';

export interface PickingRepository {
	getActiveBatch(): Promise<ActiveBatch>;
	getNextTask(batchId: number): Promise<PickTask | null>;
	confirm(input: ConfirmPickInput): Promise<SimpleMessageResult>;
	short(input: ShortPickInput): Promise<SimpleMessageResult>;
	completeBatch(batchId: number): Promise<SimpleMessageResult>;
	cancelBatch(batchId: number): Promise<SimpleMessageResult>;
}
