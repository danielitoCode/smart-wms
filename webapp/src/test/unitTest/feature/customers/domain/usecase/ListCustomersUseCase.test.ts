import { describe, expect, it, vi } from 'vitest';
import { ListCustomersUseCase } from '../../../../../../core/feature/customers/domain/usecase/ListCustomersUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('ListCustomersUseCase', () => {
	it('rejects single-character search (admin search min_length)', async () => {
		const list = vi.fn();
		const repo = { list } as unknown as CustomerRepository;
		const useCase = new ListCustomersUseCase(repo);
		expect(() => useCase.execute({ q: 'a' })).toThrow(/2 characters/);
		expect(list).not.toHaveBeenCalled();
	});

	it('forwards trimmed query and warehouseId', async () => {
		const list = vi.fn(async () => []);
		const repo = { list } as unknown as CustomerRepository;
		const useCase = new ListCustomersUseCase(repo);

		await useCase.execute({ q: '  Acme  ', warehouseId: 1 });

		expect(list).toHaveBeenCalledWith({ q: 'Acme', warehouseId: 1 });
	});

	it('rejects invalid warehouseId', async () => {
		const repo = { list: vi.fn() } as unknown as CustomerRepository;
		const useCase = new ListCustomersUseCase(repo);
		expect(() => useCase.execute({ warehouseId: 0 })).toThrow(/warehouseId/);
	});
});
