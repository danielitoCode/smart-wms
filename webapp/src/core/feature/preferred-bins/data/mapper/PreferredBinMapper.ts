import type { PreferredBin, PreferredBinCandidate } from '../../domain/entity/PreferredBin';
import type { PreferredBinDto, PreferredBinCreateDto, PreferredBinPriorityDto } from '../dto/PreferredBinDto';

export const PreferredBinMapper = {
	toDomain(dto: PreferredBinDto): PreferredBin {
		return {
			preferredBinId: dto.preferred_bin_id,
			itemId: dto.item_id,
			binId: dto.bin_id,
			warehouseId: dto.warehouse_id,
			priority: dto.priority,
			updatedAt: dto.updated_at,
			sku: dto.sku,
			itemName: dto.item_name,
			binCode: dto.bin_code,
			zoneName: dto.zone_name,
			notes: dto.notes ?? null
		};
	},
	toCreateDto(value: PreferredBinCandidate): PreferredBinCreateDto {
		return { item_id: value.itemId, bin_id: value.binId, priority: value.priority };
	},
	toUpdateDto(value: { priority: number }): PreferredBinPriorityDto {
		return { priority: value.priority };
	}
};
