import { describe, expect, it, vi } from 'vitest';
import { ListCustomersUseCase } from '../../../../../../core/feature/customers/domain/usecase/ListCustomersUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('ListCustomersUseCase', () => {
	it('forwards real sales-order pagination and warehouse scope', async () => {
		const list = vi.fn(async () => ({ customers: [], page: 2, perPage: 50, totalOrders: 120, totalPages: 3 }));
		const useCase = new ListCustomersUseCase({ list } as unknown as CustomerRepository);
		await expect(useCase.execute({ page: 2, perPage: 50, warehouseId: 4 })).resolves.toMatchObject({ page: 2, totalPages: 3 });
		expect(list).toHaveBeenCalledWith({ page: 2, perPage: 50, warehouseId: 4 });
	});
	it('rejects invalid page, page size and warehouse', () => {
		const repository = { list: vi.fn() } as unknown as CustomerRepository;
		const useCase = new ListCustomersUseCase(repository);
		expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
		expect(() => useCase.execute({ perPage: 1001 })).toThrow(/perPage/);
		expect(() => useCase.execute({ warehouseId: 0 })).toThrow(/warehouseId/);
		expect(repository.list).not.toHaveBeenCalled();
	});
});
