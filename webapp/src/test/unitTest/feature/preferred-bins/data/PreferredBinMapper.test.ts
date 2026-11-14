import { describe, expect, it } from 'vitest';
import { PreferredBinMapper } from '../../../../../core/feature/preferred-bins/data/mapper/PreferredBinMapper';

describe('PreferredBinMapper', () => {
	it('preserves the relation, item, bin and warehouse identities from Flask', () => {
		expect(PreferredBinMapper.toDomain({
			preferred_bin_id: 91,
			item_id: 7,
			bin_id: 42,
			warehouse_id: 3,
			priority: 2,
			updated_at: '2026-11-14T10:00:00Z',
			sku: 'SKU-7',
			item_name: 'Test item',
			bin_code: 'PICK-42',
			zone_name: 'Picking',
			notes: null
		})).toEqual({
			preferredBinId: 91,
			itemId: 7,
			binId: 42,
			warehouseId: 3,
			priority: 2,
			updatedAt: '2026-11-14T10:00:00Z',
			sku: 'SKU-7',
			itemName: 'Test item',
			binCode: 'PICK-42',
			zoneName: 'Picking',
			notes: null
		});
	});

	it('maps the feature-scoped catalog and pagination projection', () => {
		expect(PreferredBinMapper.toCatalog({
			warehouses: [{ warehouse_id: 3, warehouse_code: 'WH-3', warehouse_name: 'Warehouse 3' }],
			bins: [{ bin_id: 42, warehouse_id: 3, zone_id: 8, zone_name: 'Picking', bin_code: 'PICK-42', bin_barcode: 'BC-42', bin_type: 'Pickable', is_active: true }],
			total: 1, page: 1, per_page: 1000, pages: 1
		})).toEqual({
			warehouses: [{ id: 3, code: 'WH-3', name: 'Warehouse 3' }],
			bins: [{ id: 42, warehouseId: 3, zoneId: 8, zoneName: 'Picking', code: 'PICK-42', barcode: 'BC-42', active: true }],
			total: 1, page: 1, perPage: 1000, pages: 1
		});
	});

	it('maps create and priority mutation bodies to the Flask snake_case contract', () => {
		expect(PreferredBinMapper.toCreateDto({ itemId: 7, binId: 42, priority: 2 })).toEqual({
			item_id: 7, bin_id: 42, priority: 2
		});
		expect(PreferredBinMapper.toUpdateDto({ priority: 1 })).toEqual({ priority: 1 });
	});
});
