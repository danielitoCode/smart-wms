import { describe, it, expect, vi } from 'vitest';
import { LoadPackingOrderUseCase } from '../../../../../../core/feature/packing/domain/usecase/LoadPackingOrderUseCase';
import type { PackingRepository } from '../../../../../../core/feature/packing/domain/repository/PackingRepository';

describe('LoadPackingOrderUseCase', () => {
	it('loads trimmed barcode', async () => {
		const repo: PackingRepository = {
			loadOrder: vi.fn().mockResolvedValue({
				salesOrder: { soId: 1, soNumber: 'SO-001', status: 'PICKED' },
				lines: [],
				calculatedWeightLbs: 0,
				totalItems: 0,
				itemsVerified: 0
			}),
			verify: vi.fn(),
			complete: vi.fn()
		};
		const useCase = new LoadPackingOrderUseCase(repo);
		await useCase.execute('  SO-001  ');
		expect(repo.loadOrder).toHaveBeenCalledWith('SO-001');
	});

	it('rejects empty barcode', async () => {
		const repo = { loadOrder: vi.fn(), verify: vi.fn(), complete: vi.fn() } as PackingRepository;
		expect(() => (new LoadPackingOrderUseCase(repo).execute(' ')))).toThrow(/barcode/);
	});
});
