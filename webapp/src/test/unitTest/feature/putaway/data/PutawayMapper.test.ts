import { describe, expect, it } from 'vitest';
import { PutawayMapper } from '../../../../../core/feature/putaway/data/mapper/PutawayMapper';

describe('PutawayMapper', () => {
	it('preserves the suggested bin returned by the pending endpoint', () => {
		const item = PutawayMapper.toPending({
			inventory_id: 17,
			item_id: 4,
			sku: 'SKU-004',
			item_name: 'Test item',
			quantity: 8,
			bin_id: 2,
			bin_code: 'STAGE-02',
			lot_number: 'LOT-1',
			suggested_bin: 'PICK-04'
		});

		expect(item).toMatchObject({
			inventoryId: 17,
			itemId: 4,
			binId: 2,
			binCode: 'STAGE-02',
			lotNumber: 'LOT-1',
			suggestedBin: 'PICK-04'
		});
	});

	it('normalizes a missing suggested bin to null', () => {
		const item = PutawayMapper.toPending({
			inventory_id: 18,
			item_id: 5,
			sku: 'SKU-005',
			item_name: 'Another item',
			quantity: 1,
			bin_id: 3,
			bin_code: 'STAGE-03'
		});

		expect(item.suggestedBin).toBeNull();
	});
});
