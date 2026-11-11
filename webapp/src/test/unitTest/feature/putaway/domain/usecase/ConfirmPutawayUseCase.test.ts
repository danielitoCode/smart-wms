import { describe, it, expect, vi } from 'vitest';
import { ConfirmPutawayUseCase } from '../../../../../../core/feature/putaway/domain/usecase/ConfirmPutawayUseCase';
import type { PutawayRepository } from '../../../../../../core/feature/putaway/domain/repository/PutawayRepository';

describe('ConfirmPutawayUseCase', () => {
	it('confirms valid putaway and trims lot', async () => {
		const repo: PutawayRepository = {
			listPending: vi.fn(),
			suggest: vi.fn(),
			confirm: vi.fn().mockResolvedValue({
				message: 'ok',
				transferId: 1,
				item: 'TST-001',
				fromBin: 'STAGE-01',
				toBin: 'A-01-01',
				quantity: 10
			})
		};
		const useCase = new ConfirmPutawayUseCase(repo);
		const result = await useCase.execute({
			itemId: 1,
			fromBinId: 2,
			toBinId: 3,
			quantity: 10,
			lotNumber: '  L1  '
		});
		expect(result.transferId).toBe(1);
		expect(repo.confirm).toHaveBeenCalledWith({
			itemId: 1,
			fromBinId: 2,
			toBinId: 3,
			quantity: 10,
			lotNumber: 'L1'
		});
	});

	it('rejects quantity <= 0', async () => {
		const repo = {
			listPending: vi.fn(),
			suggest: vi.fn(),
			confirm: vi.fn()
		} as PutawayRepository;
		const useCase = new ConfirmPutawayUseCase(repo);
		expect(() => 
			useCase.execute({ itemId: 1, fromBinId: 1, toBinId: 2, quantity: 0 })
		).toThrow(/quantity/);
	});

	it('rejects same from/to bin', async () => {
		const repo = {
			listPending: vi.fn(),
			suggest: vi.fn(),
			confirm: vi.fn()
		} as PutawayRepository;
		const useCase = new ConfirmPutawayUseCase(repo);
		expect(() => 
			useCase.execute({ itemId: 1, fromBinId: 5, toBinId: 5, quantity: 1 })
		).toThrow(/toBinId must differ/);
	});
});
