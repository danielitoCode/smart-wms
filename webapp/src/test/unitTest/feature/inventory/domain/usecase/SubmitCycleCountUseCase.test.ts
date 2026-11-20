import { describe, it, expect, vi } from 'vitest';
import { SubmitCycleCountUseCase } from '../../../../../../core/feature/inventory/domain/usecase/SubmitCycleCountUseCase';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';
import type { CycleCountDetail, CycleCountSubmitResult } from '../../../../../../core/feature/inventory/domain/entity/CycleCount';

const openDetail: CycleCountDetail = {
	countId: 10, warehouseId: 1, binId: 2, binCode: 'A-01', binBarcode: 'A01',
	status: 'PENDING', assignedTo: 'operator', createdAt: null, showExpected: true, lines: []
};

const submittedResult: CycleCountSubmitResult = {
	countId: 10, binCode: 'A-01', status: 'COMPLETED',
	totalLines: 1, linesMatched: 1, linesWithVariance: 0, adjustments: []
};

function createRepo(overrides: Partial<InventoryRepository> = {}): InventoryRepository {
	return {
		getOverview: vi.fn(),
		lookupBarcode: vi.fn(),
		getItemInventory: vi.fn(),
		createCycleCounts: vi.fn(),
		getCycleCount: vi.fn().mockResolvedValue(openDetail),
		submitCycleCount: vi.fn().mockResolvedValue(submittedResult),
		...overrides
	};
}

describe('SubmitCycleCountUseCase', () => {
	it('checks the persisted status and submits valid snapshot lines', async () => {
		const repo = createRepo();
		const lines = [{ countLineId: 1, countedQuantity: 5 }];
		const result = await new SubmitCycleCountUseCase(repo).execute(10, lines);
		expect(repo.getCycleCount).toHaveBeenCalledWith(10);
		expect(repo.submitCycleCount).toHaveBeenCalledWith(10, lines);
		expect(result.status).toBe('COMPLETED');
	});

	it('supports unexpected products without a snapshot countLineId', async () => {
		const repo = createRepo();
		const lines = [{ unexpected: true as const, itemId: 99, sku: 'NEW-99', countedQuantity: 2 }];
		await new SubmitCycleCountUseCase(repo).execute(10, lines);
		expect(repo.submitCycleCount).toHaveBeenCalledWith(10, lines);
	});

	it('rejects invalid countId', async () => {
		await expect(new SubmitCycleCountUseCase(createRepo()).execute(0, [{ countLineId: 1, countedQuantity: 1 }])).rejects.toThrow(/countId/);
	});

	it('rejects negative or excessive counted quantities', async () => {
		const useCase = new SubmitCycleCountUseCase(createRepo());
		await expect(useCase.execute(10, [{ countLineId: 1, countedQuantity: -1 }])).rejects.toThrow(/countedQuantity/);
		await expect(useCase.execute(10, [{ countLineId: 1, countedQuantity: 1_000_001 }])).rejects.toThrow(/countedQuantity/);
	});

	it('rejects empty submissions', async () => {
		await expect(new SubmitCycleCountUseCase(createRepo()).execute(10, [])).rejects.toThrow(/empty/);
	});

	it('rejects duplicate snapshot lines', async () => {
		const repo = createRepo();
		await expect(new SubmitCycleCountUseCase(repo).execute(10, [
			{ countLineId: 1, countedQuantity: 2 },
			{ countLineId: 1, countedQuantity: 3 }
		])).rejects.toThrow(/duplicate countLineIds/);
		expect(repo.getCycleCount).not.toHaveBeenCalled();
	});

	it('rejects unexpected products already present in the snapshot', async () => {
		const repo = createRepo({
			getCycleCount: vi.fn().mockResolvedValue({ ...openDetail, lines: [{ countLineId: 4, itemId: 99, sku: 'SKU-99', itemName: 'Bearing', upc: null, expectedQuantity: 1, countedQuantity: null, variance: null, scanned: false, unexpected: false }] })
		});
		await expect(new SubmitCycleCountUseCase(repo).execute(10, [
			{ unexpected: true, itemId: 99, countedQuantity: 1 }
		])).rejects.toThrow(/already present in the count snapshot/);
		expect(repo.submitCycleCount).not.toHaveBeenCalled();
	});

	it('rejects duplicate unexpected item lines', async () => {
		const repo = createRepo();
		await expect(new SubmitCycleCountUseCase(repo).execute(10, [
			{ unexpected: true, itemId: 99, countedQuantity: 1 },
			{ unexpected: true, itemId: 99, countedQuantity: 2 }
		])).rejects.toThrow(/duplicate itemIds/);
		expect(repo.getCycleCount).not.toHaveBeenCalled();
	});

	it.each(['COMPLETED', 'VARIANCE'] as const)('does not submit a count in terminal state %s', async (status) => {
		const repo = createRepo({
			getCycleCount: vi.fn().mockResolvedValue({ ...openDetail, status })
		});
		await expect(new SubmitCycleCountUseCase(repo).execute(10, [
			{ countLineId: 1, countedQuantity: 1 }
		])).rejects.toThrow(`Cycle count status is ${status}, cannot submit`);
		expect(repo.submitCycleCount).not.toHaveBeenCalled();
	});
});
