import { describe, expect, it, vi } from 'vitest';
import { GetInventoryOverviewUseCase } from '../../../../../../core/feature/inventory/domain/usecase/GetInventoryOverviewUseCase';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';

describe('GetInventoryOverviewUseCase', () => {
	const emptyPage = { items: [], page: 1, perPage: 50, total: 0, pages: 1 };

	it('forwards warehouse, bin, search and pagination filters', async () => {
		const repository = {
			getOverview: vi.fn().mockResolvedValue(emptyPage)
		} as unknown as InventoryRepository;
		const useCase = new GetInventoryOverviewUseCase(repository);

		await useCase.execute({
			warehouseId: 2,
			binId: 9,
			query: '  bearing  ',
			page: 2,
			perPage: 25
		});

		expect(repository.getOverview).toHaveBeenCalledWith({
			warehouseId: 2,
			binId: 9,
			query: 'bearing',
			page: 2,
			perPage: 25
		});
	});

	it.each([
		[{ warehouseId: 0 }, 'warehouseId'],
		[{ itemId: -1 }, 'itemId'],
		[{ binId: 1.5 }, 'binId'],
		[{ page: 0 }, 'page'],
		[{ perPage: 1001 }, 'perPage']
	])('rejects invalid query %j', (input, message) => {
		const repository = { getOverview: vi.fn() } as unknown as InventoryRepository;
		const useCase = new GetInventoryOverviewUseCase(repository);
		expect(() => useCase.execute(input)).toThrow(message);
		expect(repository.getOverview).not.toHaveBeenCalled();
	});

	it('accepts an empty page without inventing inventory rows', async () => {
		const repository = {
			getOverview: vi.fn().mockResolvedValue(emptyPage)
		} as unknown as InventoryRepository;
		await expect(new GetInventoryOverviewUseCase(repository).execute()).resolves.toEqual(emptyPage);
	});
});
