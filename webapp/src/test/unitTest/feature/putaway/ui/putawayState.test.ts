import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PendingPutawayItem, ConfirmPutawayResult } from '../../../../../core/feature/putaway/domain/entity/Putaway';
import type { PutawayDependencies } from '../../../../../core/feature/putaway/di/putaway.dependencies';
import { createPutawayState } from '../../../../../core/feature/putaway/ui/state/putawayState.svelte';

const pendingItem: PendingPutawayItem = {
	inventoryId: 17,
	itemId: 4,
	sku: 'SKU-004',
	itemName: 'Test item',
	quantity: 8,
	binId: 2,
	binCode: 'STAGE-02',
	lotNumber: null,
	suggestedBin: {
		binId: 9,
		binCode: 'PICK-04',
		binBarcode: 'PICK-04-BC',
		zoneName: 'Pick Zone',
		priority: 1
	}
};

const confirmed: ConfirmPutawayResult = {
	message: 'Put-away confirmed',
	transferId: 91,
	item: 'SKU-004',
	fromBin: 'STAGE-02',
	toBin: 'PICK-04',
	quantity: 8
};

function createDependencies() {
	return {
		listPending: { execute: vi.fn().mockResolvedValue([pendingItem]) },
		confirm: { execute: vi.fn().mockResolvedValue(confirmed) }
	} as unknown as PutawayDependencies;
}

describe('Putaway UI state', () => {
	let dependencies: PutawayDependencies;

	beforeEach(() => {
		dependencies = createDependencies();
	});

	it('preselects the suggested bin ID and keeps its code and priority in domain state', async () => {
		const state = createPutawayState(dependencies);
		await state.load();

		expect(state.items[0].suggestedBin).toEqual(pendingItem.suggestedBin);
		expect(state.toBinByKey[state.keyOf(pendingItem)]).toBe('9');
	});

	it('confirms using the preselected suggestion without operator-entered IDs', async () => {
		const state = createPutawayState(dependencies);
		await state.load();

		await expect(state.confirm(pendingItem)).resolves.toBe(true);

		expect(dependencies.confirm.execute).toHaveBeenCalledWith({
			itemId: 4,
			fromBinId: 2,
			toBinId: 9,
			quantity: 8,
			lotNumber: null
		});
		expect(dependencies.listPending.execute).toHaveBeenCalledTimes(2);
	});

	it('does not preselect a destination when no preferred or default bin exists', async () => {
		const withoutSuggestion = { ...pendingItem, suggestedBin: null };
		vi.mocked(dependencies.listPending.execute).mockResolvedValueOnce([withoutSuggestion]);
		const state = createPutawayState(dependencies);
		await state.load();

		expect(state.toBinByKey[state.keyOf(withoutSuggestion)]).toBeUndefined();
	});
});
