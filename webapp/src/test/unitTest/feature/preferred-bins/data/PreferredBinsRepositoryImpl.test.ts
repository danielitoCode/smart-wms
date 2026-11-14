import { describe, expect, it, vi } from 'vitest';
import type { PreferredBinsRemoteDataSource } from '../../../../../core/feature/preferred-bins/data/datasource/PreferredBinsRemoteDataSource';
import { PreferredBinsRepositoryImpl } from '../../../../../core/feature/preferred-bins/data/repository/PreferredBinsRepositoryImpl';

describe('PreferredBinsRepositoryImpl', () => {
	it('maps warehouse-scoped DTOs and delegates CRUD using preferred_bin_id', async () => {
		const remote = {
			list: vi.fn().mockResolvedValue([{
				preferred_bin_id: 91, item_id: 7, bin_id: 42, warehouse_id: 3, priority: 2,
				updated_at: null, sku: 'SKU-7', item_name: 'Test item', bin_code: 'PICK-42', zone_name: 'Picking'
			}]),
			create: vi.fn().mockResolvedValue({ message: 'saved' }),
			update: vi.fn().mockResolvedValue({ message: 'updated' }),
			remove: vi.fn().mockResolvedValue({ message: 'deleted' })
		} as unknown as PreferredBinsRemoteDataSource;
		const repository = new PreferredBinsRepositoryImpl(remote);
		const rows = await repository.list({ warehouseId: 3 });
		expect(rows[0]).toMatchObject({ preferredBinId: 91, itemId: 7, binId: 42, warehouseId: 3, priority: 2 });
		expect(remote.list).toHaveBeenCalledWith({ warehouseId: 3 });

		await repository.create({ itemId: 7, binId: 42, priority: 2 });
		await repository.update(91, 1);
		await repository.remove(91);
		expect(remote.create).toHaveBeenCalledWith({ item_id: 7, bin_id: 42, priority: 2 });
		expect(remote.update).toHaveBeenCalledWith(91, { priority: 1 });
		expect(remote.remove).toHaveBeenCalledWith(91);
	});
});
