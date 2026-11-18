import { describe, expect, it, vi } from 'vitest';
import { ListItemsUseCase } from '../../../../../../core/feature/items/domain/usecase/ListItemsUseCase';

describe('ListItemsUseCase', () => {
	it('defaults filter active and validates page', async () => {
		const repo = {
			listPage: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, perPage: 50, pages: 1 })
		};
		const uc = new ListItemsUseCase(repo as never);
		await uc.execute({ q: ' bolt ' });
		expect(repo.listPage).toHaveBeenCalledWith({
			q: 'bolt',
			filter: 'active',
			category: undefined,
			page: 1,
			perPage: 50
		}, undefined);
		expect(() => uc.execute({ page: 0 })).toThrow(/page/i);
	});
});
