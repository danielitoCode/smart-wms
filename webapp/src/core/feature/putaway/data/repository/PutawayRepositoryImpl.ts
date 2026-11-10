import type { PutawayRepository } from '../../domain/repository/PutawayRepository';
import type {
	ConfirmPutawayInput,
	ConfirmPutawayResult,
	PendingPutawayItem,
	PutawaySuggestion
} from '../../domain/entity/Putaway';
import type { PutawayRemoteDataSource } from '../datasource/PutawayRemoteDataSource';
import { PutawayMapper } from '../mapper/PutawayMapper';

export class PutawayRepositoryImpl implements PutawayRepository {
	constructor(private readonly datasource: PutawayRemoteDataSource) {}

	async listPending(warehouseId: number): Promise<PendingPutawayItem[]> {
		const rows = await this.datasource.listPending(warehouseId);
		return rows.map(PutawayMapper.toPending);
	}

	async suggest(itemId: number): Promise<PutawaySuggestion> {
		const dto = await this.datasource.suggest(itemId);
		return PutawayMapper.toSuggestion(dto);
	}

	async confirm(input: ConfirmPutawayInput): Promise<ConfirmPutawayResult> {
		const dto = await this.datasource.confirm(input);
		return PutawayMapper.toConfirmResult(dto);
	}
}
