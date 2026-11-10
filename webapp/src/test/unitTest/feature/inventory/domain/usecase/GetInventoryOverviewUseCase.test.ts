import { describe, expect, it, vi } from 'vitest';
import { GetInventoryOverviewUseCase } from '#core/feature/inventory/domain/usecase/GetInventoryOverviewUseCase';
import type { InventoryRepository } from '#core/feature/inventory/domain/repository/InventoryRepository';

describe('GetInventoryOverviewUseCase', () => {
	it('forwards filters to repository', async () => {
		const repo = {
			getOverview: vi.fn().mockResolvedValue([])
		} as unknown as InventoryRepository;
		const uc = new GetInventoryOverviewUseCase(repo);
		await uc.execute({ warehouseId: 2, itemId: 9, page: 1 });
		expect(repo.getOverview).toHaveBeenCalledWith({
			warehouseId: 2,
			itemId: 9,
			page: 1
		});
	});
});
