import { describe, it, expect, vi } from 'vitest';
import { SearchItemsUseCase } from '../../../../../../core/feature/items/domain/usecase/SearchItemsUseCase';
import type { ItemRepository } from '../../../../../../core/feature/items/domain/repository/ItemRepository';

function createRepo(overrides: Partial<ItemRepository> = {}): ItemRepository {
	return {
		list: vi.fn(),
		getById: vi.fn(),
		search: vi.fn(),
		lookupByBarcode: vi.fn(),
		...overrides
	};
}

describe('SearchItemsUseCase', () => {
	it('searches with trimmed query', async () => {
		const repo = createRepo({
			search: vi.fn().mockResolvedValue([
				{
					id: 1,
					sku: 'TST-001',
					name: 'Test',
					upc: null,
					mpn: null,
					category: null,
					active: true
				}
			])
		});
		const useCase = new SearchItemsUseCase(repo);
		const result = await useCase.execute('  fly  ');
		expect(repo.search).toHaveBeenCalledWith('fly');
		expect(result[0].sku).toBe('TST-001');
	});

	it('rejects empty query', async () => {
		const useCase = new SearchItemsUseCase(createRepo());
		expect(() => (useCase.execute('   ')))).toThrow(/query/);
	});
});
