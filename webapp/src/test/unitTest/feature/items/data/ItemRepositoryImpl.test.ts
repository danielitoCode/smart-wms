import { describe, expect, it, vi } from 'vitest';
import { ItemRepositoryImpl } from '../../../../../core/feature/items/data/repository/ItemRepositoryImpl';
import type { ItemRemoteDataSource } from '../../../../../core/feature/items/data/datasource/ItemRemoteDataSource';

const pageResponse = {
	items: [{
		item_id: 7,
		sku: 'SKU-7',
		item_name: 'Caja',
		upc: '012345678905',
		mpn: 'MFR-7',
		category: 'Embalaje',
		weight_lbs: 2.5,
		default_bin_id: 12,
		default_bin_code: 'A-01-02',
		is_active: true
	}],
	total: 101,
	page: 3,
	per_page: 20,
	pages: 6
};

function createDatasource() {
	return {
		listPage: vi.fn().mockResolvedValue(pageResponse),
		getDetail: vi.fn().mockResolvedValue({
			item: pageResponse.items[0],
			inventory: [{ inventory_id: 1, bin_id: 2, bin_code: 'A-01', quantity_on_hand: 8, quantity_allocated: 2 }],
			preferred_bins: []
		}),
		archive: vi.fn().mockResolvedValue({ message: 'updated', is_active: false }),
		delete: vi.fn().mockResolvedValue(undefined)
	} as unknown as ItemRemoteDataSource;
}

describe('ItemRepositoryImpl', () => {
	it.each([
		['active', true],
		['archived', false],
		['all', undefined]
	] as const)('maps the %s filter to Flask active query', async (filter, active) => {
		const datasource = createDatasource();
		const repository = new ItemRepositoryImpl(datasource);

		const result = await repository.listPage({ filter, q: 'bolt', page: 3, perPage: 20 });

		expect(datasource.listPage).toHaveBeenCalledWith(
			{ active, q: 'bolt', page: 3, perPage: 20, category: undefined },
			undefined
		);
		expect(result).toMatchObject({
			total: 101,
			page: 3,
			perPage: 20,
			pages: 6,
			items: [{
				id: 7,
				sku: 'SKU-7',
				name: 'Caja',
				upc: '012345678905',
				mpn: 'MFR-7',
				category: 'Embalaje',
				weightLbs: 2.5,
				defaultBinId: 12,
				defaultBinCode: 'A-01-02',
				active: true
			}]
		});
	});

	it('preserves React list projections including identifiers, category, weight and default bin', async () => {
		const datasource = createDatasource();
		datasource.listPage = vi.fn().mockResolvedValue({
			items: [{
				item_id: 7,
				sku: 'SKU-7',
				item_name: 'Caja',
				upc: '012345678905',
				mpn: 'BOX-7',
				category: 'Embalaje',
				weight_lbs: 12.5,
				default_bin_id: 4,
				default_bin_code: 'A-01-02',
				is_active: true
			}],
			total: 1,
			page: 1,
			per_page: 50,
			pages: 1
		});
		const repository = new ItemRepositoryImpl(datasource);

		const result = await repository.listPage();

		expect(result.items[0]).toMatchObject({
			id: 7,
			sku: 'SKU-7',
			name: 'Caja',
			upc: '012345678905',
			mpn: 'BOX-7',
			category: 'Embalaje',
			weightLbs: 12.5,
			defaultBinId: 4,
			defaultBinCode: 'A-01-02',
			active: true
		});
	});

	it('maps detail inventory and preferred-bin projections', async () => {
		const datasource = createDatasource();
		const repository = new ItemRepositoryImpl(datasource);

		const result = await repository.getDetail(7);

		expect(datasource.getDetail).toHaveBeenCalledWith(7);
		expect(result.item).toMatchObject({
			id: 7,
			upc: '012345678905',
			mpn: 'MFR-7',
			category: 'Embalaje',
			weightLbs: 2.5,
			defaultBinId: 12,
			defaultBinCode: 'A-01-02'
		});
		expect(result.inventory[0]).toMatchObject({ inventoryId: 1, binCode: 'A-01', quantityOnHand: 8 });
		expect(result.preferredBins).toEqual([]);
	});

	it('maps archive response and forwards deletion', async () => {
		const datasource = createDatasource();
		const repository = new ItemRepositoryImpl(datasource);

		await expect(repository.archive(7)).resolves.toEqual({ message: 'updated', active: false });
		await repository.delete(7);

		expect(datasource.archive).toHaveBeenCalledWith(7);
		expect(datasource.delete).toHaveBeenCalledWith(7);
	});
});
