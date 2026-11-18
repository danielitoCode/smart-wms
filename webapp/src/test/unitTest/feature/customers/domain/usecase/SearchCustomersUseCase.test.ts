import { describe, expect, it, vi } from 'vitest';
import { SearchCustomersUseCase } from '../../../../../../core/feature/customers/domain/usecase/SearchCustomersUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('SearchCustomersUseCase', () => {
	it('trims query and forwards warehouse scope', async () => {
		const search = vi.fn().mockResolvedValue([]);
		const repository = { search } as unknown as CustomerRepository;
		await new SearchCustomersUseCase(repository).execute({ search: '  Acme  ', warehouseId: 3 });
		expect(search).toHaveBeenCalledWith({ q: 'Acme', warehouseId: 3 });
	});
	it('rejects short queries and invalid warehouse IDs', () => {
		const repository = { search: vi.fn() } as unknown as CustomerRepository;
		const useCase = new SearchCustomersUseCase(repository);
		expect(() => useCase.execute({ search: ' A ' })).toThrow(/dos caracteres/);
		expect(() => useCase.execute({ search: 'Acme', warehouseId: 0 })).toThrow(/warehouseId/);
		expect(repository.search).not.toHaveBeenCalled();
	});
});
