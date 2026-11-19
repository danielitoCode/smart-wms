import { describe, expect, it } from 'vitest';
import { ItemMapper } from '../../../../../../core/feature/items/data/mapper/ItemMapper';

describe('ItemMapper', () => {
	it('maps list row fields', () => {
		const item = ItemMapper.toItem({
			item_id: 9,
			sku: 'SKU-1',
			item_name: 'Widget',
			upc: '123',
			mpn: 'M-1',
			category: 'Parts',
			weight_lbs: 12.5,
			is_active: true,
			default_bin_id: 4,
			default_bin_code: 'A-01'
		});
		expect(item).toMatchObject({
			id: 9,
			sku: 'SKU-1',
			name: 'Widget',
			upc: '123',
			active: true,
			weightLbs: 12.5,
			defaultBinId: 4,
			defaultBinCode: 'A-01'
		});
	});

	it('unwraps detail wrapper { item, inventory, preferred_bins }', () => {
		const detail = ItemMapper.toDetail({
			item: {
				item_id: 3,
				sku: 'A',
				item_name: 'Alpha',
				is_active: false,
				weight_lbs: 3.25,
				default_bin_id: 9,
				default_bin_code: 'C-09',
				barcode_aliases: ['X']
			},
			inventory: [
				{
					inventory_id: 10,
					bin_id: 2,
					bin_code: 'B1',
					zone_name: 'Z',
					quantity_on_hand: 5,
					quantity_allocated: 1
				}
			],
			preferred_bins: [
				{ preferred_bin_id: 7, bin_id: 2, bin_code: 'B1', zone_name: 'Z', priority: 1 }
			]
		});
		expect(detail.item.id).toBe(3);
		expect(detail.item.barcodeAliases).toEqual(['X']);
		expect(detail.item.active).toBe(false);
		expect(detail.item.weightLbs).toBe(3.25);
		expect(detail.item.defaultBinCode).toBe('C-09');
		expect(detail.inventory).toHaveLength(1);
		expect(detail.inventory[0].quantityOnHand).toBe(5);
		expect(detail.preferredBins[0].priority).toBe(1);
	});

	it('maps write body to Flask field names', () => {
		expect(
			ItemMapper.toWriteBody({
				sku: 'S',
				itemName: 'N',
				weightLbs: 1.5,
				defaultBinId: 4
			})
		).toEqual({
			sku: 'S',
			item_name: 'N',
			weight_lbs: 1.5,
			default_bin_id: 4
		});
	});


	it('maps the complete detail contract and nullable metadata', () => {
		const item = ItemMapper.toItem({
			item_id: 21, sku: 'FULL-21', item_name: 'Full item',
			description: 'Description', barcode_aliases: ['ALT-1', 'ALT-2'],
			length_in: 10, width_in: 8, height_in: 6,
			reorder_point: 3, reorder_qty: 9, is_lot_tracked: true,
			is_serial_tracked: false, created_at: '2026-01-01T00:00:00Z',
			updated_at: '2026-02-01T00:00:00Z', is_active: false
		});
		expect(item).toMatchObject({
			id: 21, description: 'Description', barcodeAliases: ['ALT-1', 'ALT-2'],
			lengthIn: 10, widthIn: 8, heightIn: 6, reorderPoint: 3, reorderQty: 9,
			isLotTracked: true, isSerialTracked: false, active: false,
			createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z'
		});
	});

	it('maps reorder update fields to Flask snake_case names', () => {
		expect(ItemMapper.toWriteBody({ reorderPoint: 0, reorderQty: 12 })).toEqual({
			reorder_point: 0, reorder_qty: 12
		});
	});

	it('maps list page pagination', () => {
		const page = ItemMapper.toListPage({
			items: [{ item_id: 1, sku: 'S', item_name: 'N', is_active: true }],
			total: 100,
			page: 2,
			per_page: 50,
			pages: 2
		});
		expect(page.total).toBe(100);
		expect(page.page).toBe(2);
		expect(page.items[0].sku).toBe('S');
	});
});
