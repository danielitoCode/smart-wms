import type { ApiClient } from '../../../../infrastructure/api/ApiClient';
import type { ConfirmPutawayInput } from '../../domain/entity/Putaway';
import type { ConfirmPutawayResponseDto, PendingPutawayItemDto, PendingPutawayResponseDto, SuggestResponseDto, StagingSummaryResponseDto, UpdatePreferredResponseDto } from '../dto/PutawayDto';

export class PutawayRemoteDataSource {
	constructor(private readonly api: ApiClient) {}
	async listPending(warehouseId: number): Promise<PendingPutawayItemDto[]> {
		const body = await this.api.get<PendingPutawayResponseDto | PendingPutawayItemDto[]>('/api/putaway/pending/' + warehouseId);
		return Array.isArray(body) ? body : body.pending_items ?? body.items ?? [];
	}
	getStagingSummary(warehouseId: number): Promise<StagingSummaryResponseDto> {
		return this.api.get<StagingSummaryResponseDto>('/api/putaway/staging-summary/' + warehouseId);
	}
	suggest(itemId: number): Promise<SuggestResponseDto> {
		return this.api.get<SuggestResponseDto>('/api/putaway/suggest/' + itemId);
	}
	confirm(input: ConfirmPutawayInput): Promise<ConfirmPutawayResponseDto> {
		return this.api.post<ConfirmPutawayResponseDto>('/api/putaway/confirm', {
			item_id: input.itemId,
			...(input.fromBinId != null ? { from_bin_id: input.fromBinId } : {}),
			...(input.fromBinBarcode ? { from_bin_barcode: input.fromBinBarcode } : {}),
			...(input.toBinId != null ? { to_bin_id: input.toBinId } : {}),
			...(input.toBinBarcode ? { to_bin_barcode: input.toBinBarcode } : {}),
			quantity: input.quantity,
			...(input.lotNumber != null && input.lotNumber !== '' ? { lot_number: input.lotNumber } : {})
		});
	}
	updatePreferred(itemId: number, binId: number): Promise<UpdatePreferredResponseDto> {
		return this.api.post<UpdatePreferredResponseDto>('/api/putaway/update-preferred', { item_id: itemId, bin_id: binId, set_as_primary: true });
	}
}
