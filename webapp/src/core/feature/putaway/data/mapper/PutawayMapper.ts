import type {
	ConfirmPutawayResult,
	PendingPutawayItem,
	PutawaySuggestion,
	SuggestedBin
} from '../../domain/entity/Putaway';
import type {
	ConfirmPutawayResponseDto,
	PendingPutawayItemDto,
	SuggestResponseDto,
	SuggestedBinDto
} from '../dto/PutawayDto';

function toBin(dto: SuggestedBinDto | null | undefined): SuggestedBin | null {
	if (!dto) return null;
	return {
		binId: dto.bin_id,
		binCode: dto.bin_code,
		binBarcode: dto.bin_barcode ?? null,
		zoneName: dto.zone_name ?? null,
		priority: dto.priority ?? null
	};
}

export const PutawayMapper = {
	toPending(dto: PendingPutawayItemDto): PendingPutawayItem {
		return {
			inventoryId: dto.inventory_id,
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name,
			quantity: dto.quantity,
			binId: dto.bin_id,
			binCode: dto.bin_code,
			lotNumber: dto.lot_number ?? null
		};
	},

	toSuggestion(dto: SuggestResponseDto): PutawaySuggestion {
		return {
			itemId: dto.item_id,
			sku: dto.sku,
			itemName: dto.item_name,
			preferredBin: toBin(dto.preferred_bin),
			suggestedBin: toBin(dto.suggested_bin)
		};
	},

	toConfirmResult(dto: ConfirmPutawayResponseDto): ConfirmPutawayResult {
		return {
			message: dto.message,
			transferId: dto.transfer_id,
			item: dto.item,
			fromBin: dto.from_bin,
			toBin: dto.to_bin,
			quantity: dto.quantity
		};
	}
};
