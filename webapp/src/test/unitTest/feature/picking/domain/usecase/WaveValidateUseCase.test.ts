import { describe, expect, it, vi } from 'vitest';
import { WaveValidateUseCase } from '../../../../../../core/feature/picking/domain/usecase/WaveValidateUseCase';
import type { PickingRepository } from '../../../../../../core/feature/picking/domain/repository/PickingRepository';

describe('WaveValidateUseCase', () => {
	it('rejects empty barcode or invalid warehouse', () => {
		const repo = { waveValidate: vi.fn() } as unknown as PickingRepository;
		const uc = new WaveValidateUseCase(repo);
		expect(() => uc.execute('  ', 1)).toThrow(/so_barcode/);
		expect(() => uc.execute('SO-1', -1)).toThrow(/warehouse_id/);
	});

	it('returns repository result', async () => {
		const repo = {
			waveValidate: vi.fn().mockResolvedValue({
				valid: true,
				soNumber: 'SO-1',
				lineCount: 2,
				totalUnits: 5
			})
		} as unknown as PickingRepository;
		const uc = new WaveValidateUseCase(repo);
		const result = await uc.execute('SO-1', 1);
		expect(repo.waveValidate).toHaveBeenCalledWith('SO-1', 1);
		expect(result.valid).toBe(true);
		expect(result.lineCount).toBe(2);
	});
});
