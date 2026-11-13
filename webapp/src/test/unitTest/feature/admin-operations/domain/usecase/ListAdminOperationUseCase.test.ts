import { describe, expect, it, vi } from 'vitest';
import { ListAdminOperationUseCase } from '../../../../../../core/feature/admin-operations/domain/usecase/ListAdminOperationUseCase';
import type { AdminOperationsRepository } from '../../../../../../core/feature/admin-operations/domain/repository/AdminOperationsRepository';

describe('ListAdminOperationUseCase', () => {
  it('forwards the selected operation and query to the domain repository', async () => {
    const expected = {
      feature: 'backorders' as const,
      rows: [],
      summary: null,
      pagination: null
    };
    const list = vi.fn().mockResolvedValue(expected);
    const repository: AdminOperationsRepository = { list };
    const useCase = new ListAdminOperationUseCase(repository);
    const query = { warehouseId: 7, tab: 'ready-to-ship' as const };

    await expect(useCase.execute('backorders', query)).resolves.toBe(expected);
    expect(list).toHaveBeenCalledOnce();
    expect(list).toHaveBeenCalledWith('backorders', query);
  });

  it('propagates repository errors without converting them into empty results', async () => {
    const failure = new Error('API unavailable');
    const repository: AdminOperationsRepository = {
      list: vi.fn().mockRejectedValue(failure)
    };
    const useCase = new ListAdminOperationUseCase(repository);

    await expect(useCase.execute('users')).rejects.toBe(failure);
  });
});
