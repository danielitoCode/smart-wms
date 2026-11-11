import type { Bin, Warehouse, Zone, ZoneType, BinType } from '../../domain/entity/Warehouse';
import type { BinDto, WarehouseListItemDto, ZoneDto } from '../dto/WarehouseDto';

function requiredId(value: number | undefined, label: string): number {
	if (!Number.isInteger(value) || (value as number) <= 0) {
		throw new Error(`Invalid ${label} returned by warehouse API`);
	}
	return value as number;
}

function requiredText(value: string | undefined, label: string): string {
	if (typeof value !== 'string' || value.length === 0) {
		throw new Error(`Missing ${label} returned by warehouse API`);
	}
	return value;
}

export const WarehouseMapper = {
	toWarehouse(dto: WarehouseListItemDto): Warehouse {
		return {
			id: requiredId(dto.id ?? dto.warehouse_id, 'warehouse id'),
			code: requiredText(dto.code ?? dto.warehouse_code, 'warehouse code'),
			name: requiredText(dto.name ?? dto.warehouse_name, 'warehouse name'),
			address: dto.address ?? null,
			active: dto.active ?? dto.is_active ?? true,
			createdAt: dto.created_at ?? null
		};
	},

	toZone(dto: ZoneDto): Zone {
		const zoneType = requiredText(dto.zone_type, 'zone type');
		if (!['RECEIVING', 'STORAGE', 'PICKING', 'STAGING', 'SHIPPING'].includes(zoneType)) {
			throw new Error(`Unsupported zone type returned by warehouse API: ${zoneType}`);
		}
		return {
			id: requiredId(dto.id ?? dto.zone_id, 'zone id'),
			warehouseId: requiredId(dto.warehouse_id, 'zone warehouse id'),
			code: requiredText(dto.zone_code ?? dto.code, 'zone code'),
			name: requiredText(dto.zone_name ?? dto.name, 'zone name'),
			zoneType: zoneType as ZoneType,
			active: dto.is_active ?? dto.active ?? true
		};
	},

	toBin(dto: BinDto): Bin {
		const binType = requiredText(dto.bin_type, 'bin type');
		if (!['Staging', 'PickableStaging', 'Pickable'].includes(binType)) {
			throw new Error(`Unsupported bin type returned by warehouse API: ${binType}`);
		}
		return {
			id: requiredId(dto.id ?? dto.bin_id, 'bin id'),
			warehouseId: requiredId(dto.warehouse_id, 'bin warehouse id'),
			zoneId: dto.zone_id ?? null,
			zoneName: dto.zone_name ?? null,
			code: requiredText(dto.bin_code ?? dto.code, 'bin code'),
			barcode: dto.bin_barcode ?? dto.barcode ?? null,
			binType: binType as BinType,
			aisle: dto.aisle ?? null,
			rowNumber: dto.row_num ?? null,
			levelNumber: dto.level_num ?? null,
			positionNumber: dto.position_num ?? null,
			pickSequence: dto.pick_sequence ?? 0,
			putawaySequence: dto.putaway_sequence ?? 0,
			active: dto.is_active ?? dto.active ?? true
		};
	}
};
