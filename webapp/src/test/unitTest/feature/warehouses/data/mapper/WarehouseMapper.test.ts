import { describe, expect, it } from 'vitest';
import { WarehouseMapper } from '../../../../../../core/feature/warehouses/data/mapper/WarehouseMapper';

describe('WarehouseMapper', () => {
	it('maps the admin warehouse response fields and nullable address', () => {
		expect(WarehouseMapper.toWarehouse({
			warehouse_id: 8, warehouse_code: 'WH-08', warehouse_name: 'Main',
			address: null, is_active: false, created_at: '2026-01-02T10:00:00Z'
		})).toEqual({
			id: 8, code: 'WH-08', name: 'Main', address: null,
			active: false, createdAt: '2026-01-02T10:00:00Z'
		});
	});
	it('maps zone activity and backend zone type', () => {
		expect(WarehouseMapper.toZone({
			zone_id: 4, warehouse_id: 8, zone_code: 'PICK', zone_name: 'Picking',
			zone_type: 'PICKING', is_active: false
		})).toEqual({ id: 4, warehouseId: 8, code: 'PICK', name: 'Picking', zoneType: 'PICKING', active: false });
	});
	it('maps complete bin location and sequence fields', () => {
		expect(WarehouseMapper.toBin({
			bin_id: 12, warehouse_id: 8, zone_id: 4, zone_name: 'Picking',
			bin_code: 'A-01', bin_barcode: 'BC-01', bin_type: 'Pickable',
			aisle: 'A', row_num: 2, level_num: 3, position_num: 4,
			pick_sequence: 5, putaway_sequence: 6, is_active: true
		})).toEqual({
			id: 12, warehouseId: 8, zoneId: 4, zoneName: 'Picking',
			code: 'A-01', barcode: 'BC-01', binType: 'Pickable', aisle: 'A',
			rowNumber: 2, levelNumber: 3, positionNumber: 4,
			pickSequence: 5, putawaySequence: 6, active: true
		});
	});
	it('maps the bin inventory projection and rejects malformed identifiers', () => {
		const detail = WarehouseMapper.toBinDetail({
			bin: { bin_id: 12, warehouse_id: 8, zone_id: 4, bin_code: 'A-01', bin_type: 'Pickable', bin_barcode: null },
			inventory: [{ inventory_id: 3, item_id: 21, sku: 'SKU-21', item_name: 'Item 21', quantity_on_hand: 10, quantity_allocated: 2 }]
		});
		expect(detail.inventory[0]).toEqual({
			inventoryId: 3, itemId: 21, sku: 'SKU-21', itemName: 'Item 21',
			quantityOnHand: 10, quantityAllocated: 2
		});
		expect(() => WarehouseMapper.toWarehouse({ warehouse_id: 0, warehouse_code: 'X', warehouse_name: 'Bad' })).toThrow(/warehouse id/);
	});
});
