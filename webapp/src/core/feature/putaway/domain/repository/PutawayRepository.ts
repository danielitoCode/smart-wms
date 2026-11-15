import type {
	ConfirmPutawayInput, ConfirmPutawayResult, PendingPutawayItem,
	PutawaySuggestion, StagingBinSummary, UpdatePreferredBinResult
} from '../entity/Putaway';

export interface PutawayRepository {
	listPending(warehouseId: number): Promise<PendingPutawayItem[]>;
	getStagingSummary(warehouseId: number): Promise<StagingBinSummary[]>;
	suggest(itemId: number): Promise<PutawaySuggestion>;
	confirm(input: ConfirmPutawayInput): Promise<ConfirmPutawayResult>;
	updatePreferred(itemId: number, binId: number): Promise<UpdatePreferredBinResult>;
}
