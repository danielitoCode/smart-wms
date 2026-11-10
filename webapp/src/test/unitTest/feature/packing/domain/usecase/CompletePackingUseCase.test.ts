import { describe, expect, it, vi } from 'vitest';
import { CompletePackingUseCase } from '../../../../../../core/feature/packing/domain/usecase/CompletePackingUseCase';
import type { PackingRepository } from '../../../../../../core/feature/packing/domain/repository/PackingRepository';

describe('CompletePackingUseCase', () => {
	it('rejects non-positive soId', () => {
		const repo = { complete: vi.fn() } as unknown as PackingRepository;
		const uc = new CompletePackingUseCase(repo);
		expect(() => uc.execute(0)).toThrow(/soId/);
	});

	it('delegates to repository', async () => {
		const repo = {
			complete: vi.fn().mockResolvedValue({ message: 'packed' })
		} as unknown as PackingRepository;
		const uc = new CompletePackingUseCase(repo);
		await expect(uc.execute(4)).resolves.toEqual({ message: 'packed' });
		expect(repo.complete).toHaveBeenCalledWith(4);
	});
});
