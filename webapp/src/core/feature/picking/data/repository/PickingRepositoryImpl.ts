import type { PickingRepository } from '../../domain/repository/PickingRepository';
import type {
	ActiveBatch,
	ConfirmPickInput,
	PickTask,
	ShortPickInput,
	SimpleMessageResult,
	WaveCreateResult,
	WaveValidateResult
} from '../../domain/entity/Picking';
import type { PickingRemoteDataSource } from '../datasource/PickingRemoteDataSource';
import { PickingMapper } from '../mapper/PickingMapper';

export class PickingRepositoryImpl implements PickingRepository {
	constructor(private readonly datasource: PickingRemoteDataSource) {}

	async getActiveBatch(): Promise<ActiveBatch> {
		return PickingMapper.toActiveBatch(await this.datasource.getActiveBatch());
	}

	async getNextTask(batchId: number): Promise<PickTask | null> {
		return PickingMapper.toPickTask(await this.datasource.getNextTask(batchId));
	}

	async confirm(input: ConfirmPickInput): Promise<SimpleMessageResult> {
		return PickingMapper.toMessage(await this.datasource.confirm(input));
	}

	async short(input: ShortPickInput): Promise<SimpleMessageResult> {
		return PickingMapper.toMessage(await this.datasource.short(input));
	}

	async completeBatch(batchId: number): Promise<SimpleMessageResult> {
		return PickingMapper.toMessage(await this.datasource.completeBatch(batchId));
	}

	async cancelBatch(batchId: number): Promise<SimpleMessageResult> {
		return PickingMapper.toMessage(await this.datasource.cancelBatch(batchId));
	}

	async waveValidate(soBarcode: string, warehouseId: number): Promise<WaveValidateResult> {
		return PickingMapper.toWaveValidate(
			await this.datasource.waveValidate(soBarcode, warehouseId)
		);
	}

	async waveCreate(soIds: number[], warehouseId: number): Promise<WaveCreateResult> {
		return PickingMapper.toWaveCreate(await this.datasource.waveCreate(soIds, warehouseId));
	}
}
