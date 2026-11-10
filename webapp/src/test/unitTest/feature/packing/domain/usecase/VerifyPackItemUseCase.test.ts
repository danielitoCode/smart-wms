import { describe, expect, it, vi } from 'vitest';
import { VerifyPackItemUseCase } from '../../../../../../core/feature/packing/domain/usecase/VerifyPackItemUseCase';
import type { PackingRepository } from '../../../../../../core/feature/packing/domain/repository/PackingRepository';

describe('VerifyPackItemUseCase', () => {
	it('rejects invalid soId, empty barcode, non-positive quantity', () => {
		const repo = { verify: vi.fn() } as unknown as PackingRepository;
		const uc = new VerifyPackItemUseCase(repo);
		expect(() =>
			uc.execute({ soId: 0, scannedBarcode: 'x', quantity: 1 })
		).toThrow(/soId/);
		expect(() =>
			uc.execute({ soId: 1, scannedBarcode: '  ', quantity: 1 })
		).toThrow(/scannedBarcode/);
		expect(() =>
			uc.execute({ soId: 1, scannedBarcode: 'x', quantity: 0 })
		).toThrow(/quantity/);
	});

	it('trims barcode and defaults quantity to 1', async () => {
		const repo = {
			verify: vi.fn().mockResolvedValue({ message: 'ok' })
		} as unknown as PackingRepository;
		const uc = new VerifyPackItemUseCase(repo);
		await uc.execute({ soId: 1, scannedBarcode: ' abc ' });
		expect(repo.verify).toHaveBeenCalledWith({
			soId: 1,
			scannedBarcode: 'abc',
			quantity: 1
		});
	});
});
