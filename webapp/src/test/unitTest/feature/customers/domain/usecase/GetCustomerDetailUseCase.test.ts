import { describe, expect, it, vi } from 'vitest';
import { GetCustomerDetailUseCase } from '../../../../../../core/feature/customers/domain/usecase/GetCustomerDetailUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('GetCustomerDetailUseCase', () => {
	it('trims customer name and forwards warehouse context', async () => {
		const getDetail = vi.fn().mockResolvedValue(null);
		const repository = { getDetail } as unknown as CustomerRepository;
		await new GetCustomerDetailUseCase(repository).execute({ customerName: ' Acme ', warehouseId: 8 });
		expect(getDetail).toHaveBeenCalledWith('Acme', 8);
	});
	it('rejects empty name and invalid warehouse', () => {
		const repository = { getDetail: vi.fn() } as unknown as CustomerRepository;
		const useCase = new GetCustomerDetailUseCase(repository);
		expect(() => useCase.execute({ customerName: '  ' })).toThrow(/customerName/);
		expect(() => useCase.execute({ customerName: 'Acme', warehouseId: 0 })).toThrow(/warehouseId/);
	});
});
