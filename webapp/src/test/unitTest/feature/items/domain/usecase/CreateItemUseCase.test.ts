import { describe, expect, it, vi } from 'vitest';
import { CreateItemUseCase } from '../../../../../../core/feature/items/domain/usecase/CreateItemUseCase';

describe('CreateItemUseCase', () => {
	it('rejects empty SKU', async () => {
		const repo = { create: vi.fn() };
		const uc = new CreateItemUseCase(repo as never);
		await expect(uc.execute({ sku: '  ', itemName: 'X' })).rejects.toThrow(/SKU/i);
		expect(repo.create).not.toHaveBeenCalled();
	});

	it('rejects weight outside bounds', async () => {
		const repo = { create: vi.fn() };
		const uc = new CreateItemUseCase(repo as never);
		await expect(uc.execute({ sku: 'S', itemName: 'N', weightLbs: -1 })).rejects.toThrow(/Weight/i);
	});

	it('forwards trimmed payload', async () => {
		const repo = {
			create: vi.fn().mockResolvedValue({ id: 1, sku: 'S1', name: 'Name', active: true })
		};
		const uc = new CreateItemUseCase(repo as never);
		await uc.execute({ sku: ' S1 ', itemName: ' Name ', upc: '  ' });
		expect(repo.create).toHaveBeenCalledWith(
			expect.objectContaining({ sku: 'S1', itemName: 'Name', upc: null })
		);
	});
});
