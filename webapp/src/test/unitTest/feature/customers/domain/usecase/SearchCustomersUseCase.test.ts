import { describe, expect, it, vi } from 'vitest';
import { SearchCustomersUseCase } from '../../../../../../core/feature/customers/domain/usecase/SearchCustomersUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('SearchCustomersUseCase', () => {
  it('trims the query before calling the repository', async () => {
    const repository = { search: vi.fn().mockResolvedValue([]) } as unknown as CustomerRepository;
    await new SearchCustomersUseCase(repository).execute({ search: '  Acme  ' });
    expect(repository.search).toHaveBeenCalledWith({ search: 'Acme' });
  });

  it('rejects queries shorter than two characters without a request', () => {
    const repository = { search: vi.fn() } as unknown as CustomerRepository;
    expect(() => new SearchCustomersUseCase(repository).execute({ search: ' A ' })).toThrow(/dos caracteres/);
    expect(repository.search).not.toHaveBeenCalled();
  });
});
