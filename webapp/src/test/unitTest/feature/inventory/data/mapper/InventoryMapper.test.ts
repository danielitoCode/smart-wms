import { describe, expect, it } from 'vitest';
import { InventoryMapper } from '../../../../../../core/feature/inventory/data/mapper/InventoryMapper';
import type { InventoryRowDto } from '../../../../../../core/feature/inventory/data/dto/InventoryDto';

describe('InventoryMapper', () => {
	it('maps the API read model without conflating allocated and committed quantities', () => {
		const row: InventoryRowDto = {
			inventory_id: 91,
			item_id: 7,
			sku: 'SKU-007',
			item_name: 'Bearing',
			bin_id: 4,
			bin_code: 'A-01',
			zone_name: 'PICK',
			quantity_on_hand: 10,
			quantity_allocated: 3,
			quantity_available: 7,
			committed_to_orders: 5,
			lot_number: 'LOT-A',
			last_counted_at: null
		};

		expect(InventoryMapper.toStock(row)).toEqual({
			inventoryId: 91,
			itemId: 7,
			binId: 4,
			quantityOnHand: 10,
			quantityAllocated: 3,
			quantityAvailable: 7,
			committedToOrders: 5,
			lotNumber: 'LOT-A',
			sku: 'SKU-007',
			itemName: 'Bearing',
			binCode: 'A-01',
			zoneName: 'PICK',
			lastCountedAt: null
		});
	});

	it('preserves zero on-hand rows instead of treating them as missing', () => {
		const row: InventoryRowDto = {
			inventory_id: 92,
			item_id: 7,
			sku: 'SKU-007',
			item_name: 'Bearing',
			bin_id: 4,
			bin_code: 'A-01',
			zone_name: null,
			quantity_on_hand: 0,
			quantity_allocated: 0,
			quantity_available: 0,
			committed_to_orders: 0,
			lot_number: null,
			last_counted_at: null
		};

		expect(InventoryMapper.toStock(row).quantityOnHand).toBe(0);
	});
});
