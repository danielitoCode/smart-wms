import { describe, expect, it, vi } from 'vitest';
import { VerifyPackItemUseCase } from '../../../../../../core/feature/packing/domain/usecase/VerifyPackItemUseCase';
import type { PackingRepository } from '../../../../../../core/feature/packing/domain/repository/PackingRepository';

describe('VerifyPackItemUseCase', () => {
	it('rejects invalid soId, empty barcode, non-positive quantity', () => {
		const repo = { verify: vi.fn() } as unknown as PackingRepository;
		const uc = new VerifyPackItemUseCase(repo);
		expect(() =>
			uc.execute({ soId: 0, warehouseId: 7, scannedBarcode: 'x', quantity: 1 })
		).toThrow(/soId/);
		expect(() =>
			uc.execute({ soId: 1, warehouseId: 7, scannedBarcode: '  ', quantity: 1 })
		).toThrow(/scannedBarcode/);
		expect(() =>
			uc.execute({ soId: 1, warehouseId: 7, scannedBarcode: 'x', quantity: 0 })
		).toThrow(/quantity/);
	});

	it('trims barcode and defaults quantity to 1', async () => {
		const repo = {
			verify: vi.fn().mockResolvedValue({ message: 'ok', item: { sku: 'A', itemName: 'A', quantityVerified: 1, lineComplete: false }, orderProgress: { totalLines: 2, linesVerified: 1, allVerified: false } })
		} as unknown as PackingRepository;
		const uc = new VerifyPackItemUseCase(repo);
		await expect(uc.execute({ soId: 1, warehouseId: 7, scannedBarcode: ' abc ' })).resolves.toMatchObject({ orderProgress: { linesVerified: 1, allVerified: false } });
		expect(repo.verify).toHaveBeenCalledWith({
			soId: 1,
			warehouseId: 7,
			scannedBarcode: 'abc',
			quantity: 1
		});
	});
});
