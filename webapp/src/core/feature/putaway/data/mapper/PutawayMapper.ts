import type { ConfirmPutawayResult, PendingPutawayItem, PutawaySuggestion, SuggestedBin, StagingBinSummary, UpdatePreferredBinResult } from '../../domain/entity/Putaway';
import type { ConfirmPutawayResponseDto, PendingPutawayItemDto, SuggestResponseDto, SuggestedBinDto, StagingBinDto, UpdatePreferredResponseDto } from '../dto/PutawayDto';

function toBin(dto: SuggestedBinDto | null | undefined): SuggestedBin | null {
	if (!dto) return null;
	return { binId: dto.bin_id, binCode: dto.bin_code, binBarcode: dto.bin_barcode ?? null, zoneName: dto.zone_name ?? null, priority: dto.priority ?? null };
}
export const PutawayMapper = {
	toPending(dto: PendingPutawayItemDto): PendingPutawayItem {
		return { inventoryId: dto.inventory_id, itemId: dto.item_id, sku: dto.sku, itemName: dto.item_name, quantity: dto.quantity, binId: dto.bin_id, binCode: dto.bin_code, binBarcode: dto.bin_barcode ?? null, lotNumber: dto.lot_number ?? null,
			suggestedBin: dto.suggested_bin && dto.suggested_bin_id != null ? { binId: dto.suggested_bin_id, binCode: dto.suggested_bin, binBarcode: dto.suggested_bin_barcode ?? null, zoneName: dto.suggested_bin_zone ?? null, priority: dto.suggested_bin_priority ?? null } : null };
	},
	toSuggestion(dto: SuggestResponseDto): PutawaySuggestion {
		return { itemId: dto.item_id, sku: dto.sku, itemName: dto.item_name, preferredBin: toBin(dto.preferred_bin), suggestedBin: toBin(dto.suggested_bin) };
	},
	toStagingBin(dto: StagingBinDto): StagingBinSummary {
		return { binId: dto.bin_id, binCode: dto.bin_code, skuCount: dto.sku_count, totalQuantity: dto.total_qty, items: (dto.items ?? []).map(item => ({ inventoryId: item.inventory_id, itemId: item.item_id, sku: item.sku, itemName: item.item_name, quantity: item.quantity_on_hand, lotNumber: item.lot_number ?? null })) };
	},
	toConfirmResult(dto: ConfirmPutawayResponseDto): ConfirmPutawayResult {
		return { message: dto.message, transferId: dto.transfer_id, item: dto.item, fromBin: dto.from_bin, toBin: dto.to_bin, quantity: dto.quantity };
	},
	toPreferredResult(dto: UpdatePreferredResponseDto): UpdatePreferredBinResult {
		return { message: dto.message, itemId: dto.item_id, binId: dto.bin_id, binCode: dto.bin_code };
	}
};
