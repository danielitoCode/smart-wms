import { describe, expect, it, vi } from 'vitest';
import type { InventoryRepository } from '../../../../../../core/feature/inventory/domain/repository/InventoryRepository';
import { LookupBarcodeUseCase } from '../../../../../../core/feature/inventory/domain/usecase/LookupBarcodeUseCase';

describe('LookupBarcodeUseCase', () => {
	it('trims a scanned code before lookup', async () => {
		const repository = { lookupBarcode: vi.fn().mockResolvedValue({ itemId: 8, sku: 'SKU-8', itemName: 'Bearing', upc: '001234' }) } as unknown as InventoryRepository;
		await expect(new LookupBarcodeUseCase(repository).execute(' 001234 ')).resolves.toMatchObject({ itemId: 8 });
		expect(repository.lookupBarcode).toHaveBeenCalledWith('001234');
	});

	it('rejects empty and oversized codes without calling the repository', async () => {
		const repository = { lookupBarcode: vi.fn() } as unknown as InventoryRepository;
		const useCase = new LookupBarcodeUseCase(repository);
		await expect(useCase.execute('  ')).rejects.toThrow(/required/);
		await expect(useCase.execute('x'.repeat(129))).rejects.toThrow(/128/);
		expect(repository.lookupBarcode).not.toHaveBeenCalled();
	});
});
