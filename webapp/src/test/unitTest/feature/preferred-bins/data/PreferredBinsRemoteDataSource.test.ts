import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { PreferredBinsRemoteDataSource } from '../../../../../core/feature/preferred-bins/data/datasource/PreferredBinsRemoteDataSource';

describe('PreferredBinsRemoteDataSource', () => {
	it('requests the scoped list using the real Flask query parameter names', async () => {
		const api = { get: vi.fn().mockResolvedValue({ preferred_bins: [] }) } as unknown as ApiClient;
		const source = new PreferredBinsRemoteDataSource(api);
		await source.list({ search: ' SKU-7 ', itemId: 7, warehouseId: 3 });
		expect(api.get).toHaveBeenCalledWith('/api/admin/preferred-bins?q=SKU-7&item_id=7&warehouse_id=3');
	});

	it('uses the supported collection POST and relation-id PUT/DELETE endpoints', async () => {
		const api = {
			get: vi.fn().mockResolvedValue({ preferred_bins: [] }),
			post: vi.fn().mockResolvedValue({ message: 'Preferred bin saved' }),
			put: vi.fn().mockResolvedValue({ message: 'Priority updated' }),
			delete: vi.fn().mockResolvedValue({ message: 'Preferred bin deleted' })
		} as unknown as ApiClient;
		const source = new PreferredBinsRemoteDataSource(api);
		const body = { item_id: 7, bin_id: 42, priority: 2 };
		await source.create(body);
		await source.update(91, { priority: 1 });
		await source.remove(91);
		expect(api.post).toHaveBeenCalledWith('/api/admin/preferred-bins', body);
		expect(api.put).toHaveBeenCalledWith('/api/admin/preferred-bins/91', { priority: 1 });
		expect(api.delete).toHaveBeenCalledWith('/api/admin/preferred-bins/91');
	});

	it('returns an empty collection for a missing preferred_bins envelope', async () => {
		const api = { get: vi.fn().mockResolvedValue({}) } as unknown as ApiClient;
		await expect(new PreferredBinsRemoteDataSource(api).list()).resolves.toEqual([]);
	});
});
