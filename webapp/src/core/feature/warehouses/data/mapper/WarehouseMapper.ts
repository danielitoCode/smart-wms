import type { Bin, Warehouse, Zone } from '../../domain/entity/Warehouse';
import type { BinDto, WarehouseListItemDto, ZoneDto } from '../dto/WarehouseDto';

export const WarehouseMapper = {
	toWarehouse(dto: WarehouseListItemDto): Warehouse {
		return {
			id: dto.id ?? dto.warehouse_id ?? 0,
			code: dto.code ?? dto.warehouse_code ?? '',
			name: dto.name ?? dto.warehouse_name ?? '',
			active: dto.active ?? dto.is_active ?? true
		};
	},

	toZone(dto: ZoneDto): Zone {
		return {
			id: dto.id ?? dto.zone_id ?? 0,
			warehouseId: dto.warehouse_id,
			code: dto.zone_code ?? dto.code ?? '',
			name: dto.zone_name ?? dto.name ?? '',
			zoneType: dto.zone_type ?? 'STORAGE'
		};
	},

	toBin(dto: BinDto): Bin {
		return {
			id: dto.id ?? dto.bin_id ?? 0,
			warehouseId: dto.warehouse_id,
			zoneId: dto.zone_id ?? null,
			code: dto.bin_code ?? dto.code ?? '',
			barcode: dto.bin_barcode ?? dto.barcode ?? null,
			binType: dto.bin_type ?? 'Pickable'
		};
	}
};
