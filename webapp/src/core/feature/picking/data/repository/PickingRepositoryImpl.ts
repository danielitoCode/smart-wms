import type { PickingRepository } from '../../domain/repository/PickingRepository';
import type {
	ActiveBatch,
	ConfirmPickInput,
	PickTask,
	ShortPickInput,
	SimpleMessageResult
} from '../../domain/entity/Picking';
import type { PickingRemoteDataSource } from '../datasource/PickingRemoteDataSource';
import { PickingMapper } from '../mapper/PickingMapper';

export class PickingRepositoryImpl implements PickingRepository {
	constructor(private readonly datasource: PickingRemoteDataSource) {}

	async getActiveBatch(): Promise<ActiveBatch> {
		const dto = await this.datasource.getActiveBatch();
		return PickingMapper.toActiveBatch(dto);
	}

	async getNextTask(batchId: number): Promise<PickTask | null> {
		const dto = await this.datasource.getNextTask(batchId);
		return PickingMapper.toPickTask(dto);
	}

	async confirm(input: ConfirmPickInput): Promise<SimpleMessageResult> {
		const dto = await this.datasource.confirm(input);
		return PickingMapper.toMessage(dto);
	}

	async short(input: ShortPickInput): Promise<SimpleMessageResult> {
		const dto = await this.datasource.short(input);
		return PickingMapper.toMessage(dto);
	}

	async completeBatch(batchId: number): Promise<SimpleMessageResult> {
		const dto = await this.datasource.completeBatch(batchId);
		return PickingMapper.toMessage(dto);
	}

	async cancelBatch(batchId: number): Promise<SimpleMessageResult> {
		const dto = await this.datasource.cancelBatch(batchId);
		return PickingMapper.toMessage(dto);
	}
}
