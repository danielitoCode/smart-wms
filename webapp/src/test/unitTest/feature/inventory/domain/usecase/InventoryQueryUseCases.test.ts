import { describe, expect, it, vi } from 'vitest';
import { GetItemInventoryUseCase } from '../../../../../../core/feature/inventory/domain/usecase/GetItemInventoryUseCase';
import { SearchInventoryUseCase } from '../../../../../../core/feature/inventory/domain/usecase/SearchInventoryUseCase';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';

describe('Inventory query use cases', () => {
	const emptyPage = { items: [], page: 1, perPage: 50, total: 0, pages: 1 };

	it('searches server-side with the warehouse and bin scope', async () => {
		const repository = {
			getOverview: vi.fn().mockResolvedValue(emptyPage)
		} as unknown as InventoryRepository;
		const useCase = new SearchInventoryUseCase(repository);

		await useCase.execute('  bearing  ', { warehouseId: 3, binId: 12, page: 2 });

		expect(repository.getOverview).toHaveBeenCalledWith({
			warehouseId: 3,
			binId: 12,
			page: 2,
			query: 'bearing'
		});
	});

	it('loads item stock across locations using the item filter', async () => {
		const repository = {
			getItemInventory: vi.fn().mockResolvedValue(emptyPage)
		} as unknown as InventoryRepository;
		const useCase = new GetItemInventoryUseCase(repository);

		await useCase.execute(17, { warehouseId: 3 });

		expect(repository.getItemInventory).toHaveBeenCalledWith(17, { warehouseId: 3 });
	});

	it('rejects invalid item identifiers without calling the repository', () => {
		const repository = {
			getItemInventory: vi.fn()
		} as unknown as InventoryRepository;
		const useCase = new GetItemInventoryUseCase(repository);

		expect(() => useCase.execute(0)).toThrow('itemId');
		expect(repository.getItemInventory).not.toHaveBeenCalled();
	});
});
