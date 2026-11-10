import { describe, it, expect, vi } from 'vitest';
import { ReceiveGoodsUseCase } from '../../../../../../core/feature/receiving/domain/usecase/ReceiveGoodsUseCase';
import type { ReceivingRepository } from '../../../../../../core/feature/receiving/domain/repository/ReceivingRepository';

function createRepo(overrides: Partial<ReceivingRepository> = {}): ReceivingRepository {
	return {
		lookupByBarcode: vi.fn(),
		receive: vi.fn(),
		cancelReceipts: vi.fn(),
		...overrides
	};
}

describe('ReceiveGoodsUseCase', () => {
	it('receives valid lines', async () => {
		const repo = createRepo({
			receive: vi.fn().mockResolvedValue({
				message: 'ok',
				receiptIds: [1],
				poStatus: 'PARTIAL',
				warnings: []
			})
		});
		const useCase = new ReceiveGoodsUseCase(repo);
		const result = await useCase.execute(1, [{ itemId: 2, quantity: 5, binId: 3 }]);
		expect(repo.receive).toHaveBeenCalledWith(1, [{ itemId: 2, quantity: 5, binId: 3 }]);
		expect(result.receiptIds).toEqual([1]);
	});

	it('rejects quantity <= 0', async () => {
		const useCase = new ReceiveGoodsUseCase(createRepo());
		await expect(
			useCase.execute(1, [{ itemId: 1, quantity: 0, binId: 1 }])
		).rejects.toThrow(/quantity/);
	});

	it('rejects empty items', async () => {
		const useCase = new ReceiveGoodsUseCase(createRepo());
		await expect(useCase.execute(1, [])).rejects.toThrow(/items/);
	});
});
