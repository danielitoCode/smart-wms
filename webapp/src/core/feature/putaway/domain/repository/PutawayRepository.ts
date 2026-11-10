import type {
	ConfirmPutawayInput,
	ConfirmPutawayResult,
	PendingPutawayItem,
	PutawaySuggestion
} from '../entity/Putaway';

export interface PutawayRepository {
	listPending(warehouseId: number): Promise<PendingPutawayItem[]>;
	suggest(itemId: number): Promise<PutawaySuggestion>;
	confirm(input: ConfirmPutawayInput): Promise<ConfirmPutawayResult>;
}
