import type { Bin, BinDetail, BinInventoryRow, Warehouse, Zone, ZoneType, BinType } from '../../domain/entity/Warehouse';
import type { BinDetailResponseDto, BinDto, OperationalBinLookupDto, OperationalBinSearchResultDto, WarehouseListItemDto, ZoneDto } from '../dto/WarehouseDto';

function requiredId(value: number | undefined, label: string): number {
	if (!Number.isInteger(value) || (value as number) <= 0) throw new Error('Invalid ' + label + ' returned by warehouse API');
	return value as number;
}
function requiredText(value: string | undefined, label: string): string {
	if (typeof value !== 'string' || value.length === 0) throw new Error('Missing ' + label + ' returned by warehouse API');
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
			throw new Error('Unsupported zone type returned by warehouse API: ' + zoneType);
		}
		return {
			id: requiredId(dto.zone_id, 'zone id'),
			warehouseId: requiredId(dto.warehouse_id, 'zone warehouse id'),
			code: requiredText(dto.zone_code, 'zone code'),
			name: requiredText(dto.zone_name, 'zone name'),
			zoneType: zoneType as ZoneType,
			active: dto.is_active,
			binsCount: dto.bins_count ?? 0
		};
	},
	toBin(dto: BinDto): Bin {
		const binType = requiredText(dto.bin_type, 'bin type');
		if (!['Staging', 'PickableStaging', 'Pickable'].includes(binType)) {
			throw new Error('Unsupported bin type returned by warehouse API: ' + binType);
		}
		return {
			id: requiredId(dto.bin_id, 'bin id'),
			warehouseId: requiredId(dto.warehouse_id, 'bin warehouse id'),
			zoneId: dto.zone_id ?? null,
			zoneName: dto.zone_name ?? null,
			code: requiredText(dto.bin_code, 'bin code'),
			barcode: dto.bin_barcode,
			binType: binType as BinType,
			aisle: dto.aisle ?? null,
			rowNumber: dto.row_num ?? null,
			levelNumber: dto.level_num ?? null,
			positionNumber: dto.position_num ?? null,
			pickSequence: dto.pick_sequence ?? 0,
			putawaySequence: dto.putaway_sequence ?? 0,
			active: dto.is_active,
			quantityOnHand: dto.quantity_on_hand ?? 0,
			quantityAllocated: dto.quantity_allocated ?? 0,
			inventoryLines: dto.inventory_lines ?? 0
		};
	},
	toOperationalBinSearchResult(dto: OperationalBinSearchResultDto) {
		const binType = requiredText(dto.bin_type, 'operational bin type');
		if (!['Staging', 'PickableStaging', 'Pickable'].includes(binType)) {
			throw new Error('Unsupported operational bin type returned by lookup API: ' + binType);
		}
		return {
			id: requiredId(dto.bin_id, 'operational bin id'),
			warehouseId: dto.warehouse_id ?? null,
			code: requiredText(dto.bin_code, 'operational bin code'),
			barcode: dto.bin_barcode ?? null,
			binType: binType as BinType,
			zoneName: dto.zone_name ?? null,
			aisle: dto.aisle ?? null,
			rowNumber: dto.row_num ?? null,
			levelNumber: dto.level_num ?? null
		};
	},
	toOperationalBinLookup(dto: OperationalBinLookupDto) {
		return {
			bin: this.toOperationalBinSearchResult(dto.bin),
			items: dto.items.map(row => ({
				itemId: requiredId(row.item_id, 'lookup item id'),
				sku: requiredText(row.sku, 'lookup SKU'),
				itemName: requiredText(row.item_name, 'lookup item name'),
				upc: row.upc ?? null,
				quantityOnHand: row.quantity_on_hand,
				quantityAllocated: row.quantity_allocated,
				quantityAvailable: row.quantity_available,
				lotNumber: row.lot_number ?? null
			}))
		};
	},
	toBinDetail(dto: BinDetailResponseDto): BinDetail {
		const inventory: BinInventoryRow[] = dto.inventory.map(row => ({
			inventoryId: requiredId(row.inventory_id, 'inventory id'),
			itemId: requiredId(row.item_id, 'inventory item id'),
			sku: requiredText(row.sku, 'inventory SKU'),
			itemName: requiredText(row.item_name, 'inventory item name'),
			quantityOnHand: row.quantity_on_hand,
			quantityAllocated: row.quantity_allocated
		}));
		const quantityOnHand = inventory.reduce((sum, row) => sum + row.quantityOnHand, 0);
		const quantityAllocated = inventory.reduce((sum, row) => sum + row.quantityAllocated, 0);
		return { bin: this.toBin(dto.bin), inventory, occupancy: { quantityOnHand, quantityAllocated, quantityAvailable: quantityOnHand - quantityAllocated, inventoryLines: inventory.length } };
	}
};
