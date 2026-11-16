import { describe, expect, it, vi } from 'vitest';
import type { SalesOrderRepository } from '../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import { ListSalesOrderShortPicksUseCase } from '../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrderShortPicksUseCase';

describe('ListSalesOrderShortPicksUseCase', () => {
  it('loads the requested period and warehouse scope', async () => {
    const listShortPicks = vi.fn().mockResolvedValue([]);
    const repository = { listShortPicks } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrderShortPicksUseCase(repository);

    await expect(useCase.execute(14, 6)).resolves.toEqual([]);
    expect(listShortPicks).toHaveBeenCalledWith(14, 6);
  });

  it('rejects invalid period and warehouse identifiers', () => {
    const repository = { listShortPicks: vi.fn() } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrderShortPicksUseCase(repository);

    expect(() => useCase.execute(0)).toThrow('período');
    expect(() => useCase.execute(30, 0)).toThrow('almacén');
    expect(repository.listShortPicks).not.toHaveBeenCalled();
  });
});
