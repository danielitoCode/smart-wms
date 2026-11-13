import { describe, expect, it, vi } from 'vitest';
import { SearchCustomersUseCase } from '../../../../../../core/feature/customers/domain/usecase/SearchCustomersUseCase';
import type { CustomerRepository } from '../../../../../../core/feature/customers/domain/repository/CustomerRepository';

describe('SearchCustomersUseCase', () => {
  it('trims the query before calling the repository', async () => {
    const list = vi.fn().mockResolvedValue([]);
    const repository = { list } as unknown as CustomerRepository;
    await new SearchCustomersUseCase(repository).execute({ search: '  Acme  ' });
    expect(list).toHaveBeenCalledWith({ q: 'Acme' });
  });

  it('rejects queries shorter than two characters without a request', () => {
    const list = vi.fn();
    const repository = { list } as unknown as CustomerRepository;
    expect(() => new SearchCustomersUseCase(repository).execute({ search: ' A ' })).toThrow(/dos caracteres/);
    expect(list).not.toHaveBeenCalled();
  });
});
