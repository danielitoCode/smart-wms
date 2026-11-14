import type { PreferredBin, PreferredBinCandidate } from '../../domain/entity/PreferredBin';
import type { PreferredBinDto, PreferredBinCreateDto, PreferredBinPriorityDto, PreferredBinCatalogDto } from '../dto/PreferredBinDto';

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
	toCatalog(dto: PreferredBinCatalogDto) {
		return {
			warehouses: dto.warehouses.map(row => ({ id: row.warehouse_id, code: row.warehouse_code, name: row.warehouse_name })),
			bins: dto.bins.map(row => ({
				id: row.bin_id, warehouseId: row.warehouse_id, zoneId: row.zone_id,
				zoneName: row.zone_name, code: row.bin_code, barcode: row.bin_barcode, active: row.is_active
			})),
			total: dto.total, page: dto.page, perPage: dto.per_page, pages: dto.pages
		};
	},
	toCreateDto(value: PreferredBinCandidate): PreferredBinCreateDto {
		return { item_id: value.itemId, bin_id: value.binId, priority: value.priority };
	},
	toUpdateDto(value: { priority: number }): PreferredBinPriorityDto {
		return { priority: value.priority };
	}
};
