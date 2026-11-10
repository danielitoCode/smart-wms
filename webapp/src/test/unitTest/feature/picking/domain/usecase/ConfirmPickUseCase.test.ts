import { describe, it, expect, vi } from 'vitest';
import { ConfirmPickUseCase } from '../../../../../../core/feature/picking/domain/usecase/ConfirmPickUseCase';
import type { PickingRepository } from '../../../../../../core/feature/picking/domain/repository/PickingRepository';

function createRepo(overrides: Partial<PickingRepository> = {}): PickingRepository {
	return {
		getActiveBatch: vi.fn(),
		getNextTask: vi.fn(),
		confirm: vi.fn(),
		short: vi.fn(),
		completeBatch: vi.fn(),
		cancelBatch: vi.fn(),
		...overrides
	};
}

describe('ConfirmPickUseCase', () => {
	it('confirms with trimmed barcode', async () => {
		const repo = createRepo({
			confirm: vi.fn().mockResolvedValue({ message: 'picked' })
		});
		const useCase = new ConfirmPickUseCase(repo);
		const result = await useCase.execute({
			pickTaskId: 1,
			scannedBarcode: ' 100000000001 ',
			quantityPicked: 2
		});
		expect(repo.confirm).toHaveBeenCalledWith({
			pickTaskId: 1,
			scannedBarcode: '100000000001',
			quantityPicked: 2
		});
		expect(result.message).toBe('picked');
	});

	it('rejects empty barcode', async () => {
		const useCase = new ConfirmPickUseCase(createRepo());
		await expect(
			useCase.execute({ pickTaskId: 1, scannedBarcode: '  ', quantityPicked: 1 })
		).rejects.toThrow(/barcode/);
	});
});
