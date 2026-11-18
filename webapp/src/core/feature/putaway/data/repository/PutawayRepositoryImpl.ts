import type { PutawayRepository } from '../../domain/repository/PutawayRepository';
import type {
	ConfirmPutawayInput, ConfirmPutawayResult, PendingPutawayItem, PutawaySuggestion,
	StagingBinSummary, UpdatePreferredBinResult
} from '../../domain/entity/Putaway';
import type { PutawayRemoteDataSource } from '../datasource/PutawayRemoteDataSource';
import { PutawayMapper } from '../mapper/PutawayMapper';

export class PutawayRepositoryImpl implements PutawayRepository {
	constructor(private readonly datasource: PutawayRemoteDataSource) {}
	async listPending(warehouseId: number): Promise<PendingPutawayItem[]> {
		return (await this.datasource.listPending(warehouseId)).map(PutawayMapper.toPending);
	}
	async getStagingSummary(warehouseId: number): Promise<StagingBinSummary[]> {
		return (await this.datasource.getStagingSummary(warehouseId)).bins.map(PutawayMapper.toStagingBin);
	}
	async suggest(itemId: number): Promise<PutawaySuggestion> {
		return PutawayMapper.toSuggestion(await this.datasource.suggest(itemId));
	}
	async confirm(input: ConfirmPutawayInput): Promise<ConfirmPutawayResult> {
		return PutawayMapper.toConfirmResult(await this.datasource.confirm(input));
	}
	async updatePreferred(itemId: number, binId: number): Promise<UpdatePreferredBinResult> {
		return PutawayMapper.toPreferredResult(await this.datasource.updatePreferred(itemId, binId));
	}
}
