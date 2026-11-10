import { describe, it, expect, vi } from 'vitest';
import { ListItemsUseCase } from '../../../../../../core/feature/items/domain/usecase/ListItemsUseCase';
import type { ItemRepository } from '../../../../../../core/feature/items/domain/repository/ItemRepository';

describe('ListItemsUseCase', () => {
	it('rejects invalid page', async () => {
		const repo = { list: vi.fn(), search: vi.fn() } as ItemRepository;
		const uc = new ListItemsUseCase(repo);
		await expect(uc.execute({ page: 0 })).rejects.toThrow(/page/);
	});

	it('trims category and q', async () => {
		const repo = {
			list: vi.fn().mockResolvedValue([]),
			search: vi.fn()
		} as ItemRepository;
		const uc = new ListItemsUseCase(repo);
		await uc.execute({ category: '  A  ', q: '  sku  ', active: true });
		expect(repo.list).toHaveBeenCalledWith({
			category: 'A',
			q: 'sku',
			active: true,
			page: undefined
		});
	});
});
