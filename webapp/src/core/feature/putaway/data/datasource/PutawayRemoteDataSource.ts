import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ConfirmPutawayInput } from '../../domain/entity/Putaway';
import type {
	ConfirmPutawayResponseDto,
	PendingPutawayItemDto,
	PendingPutawayResponseDto,
	SuggestResponseDto
} from '../dto/PutawayDto';

export class PutawayRemoteDataSource {
	constructor(private readonly api: ApiClient) {}

	async listPending(warehouseId: number): Promise<PendingPutawayItemDto[]> {
		const body = await this.api.get<PendingPutawayResponseDto | PendingPutawayItemDto[]>(
			`/api/putaway/pending/${warehouseId}`
		);
		if (Array.isArray(body)) return body;
		return body.pending_items ?? body.items ?? [];
	}

	suggest(itemId: number): Promise<SuggestResponseDto> {
		return this.api.get<SuggestResponseDto>(`/api/putaway/suggest/${itemId}`);
	}

	confirm(input: ConfirmPutawayInput): Promise<ConfirmPutawayResponseDto> {
		return this.api.post<ConfirmPutawayResponseDto>('/api/putaway/confirm', {
			item_id: input.itemId,
			from_bin_id: input.fromBinId,
			to_bin_id: input.toBinId,
			quantity: input.quantity,
			...(input.lotNumber != null && input.lotNumber !== ''
				? { lot_number: input.lotNumber }
				: {})
		});
	}
}
