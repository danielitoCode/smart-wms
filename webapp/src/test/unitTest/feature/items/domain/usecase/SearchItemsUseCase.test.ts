import { describe, expect, it, vi } from 'vitest';
import { SearchItemsUseCase } from '../../../../../../core/feature/items/domain/usecase/SearchItemsUseCase';

describe('SearchItemsUseCase', () => {
	it('returns empty for blank query without calling repository', async () => {
		const repo = { search: vi.fn() };
		const uc = new SearchItemsUseCase(repo as never);
		await expect(uc.execute('   ')).resolves.toEqual([]);
		expect(repo.search).not.toHaveBeenCalled();
	});

	it('trims and searches', async () => {
		const repo = { search: vi.fn().mockResolvedValue([{ id: 1, sku: 'A', name: 'A', active: true }]) };
		const uc = new SearchItemsUseCase(repo as never);
		await uc.execute('  A  ');
		expect(repo.search).toHaveBeenCalledWith('A');
	});
});
