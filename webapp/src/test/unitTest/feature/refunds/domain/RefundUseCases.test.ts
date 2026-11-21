import { describe, expect, it, vi } from 'vitest';
import type { RefundsRepository } from '../../../../../core/feature/refunds/domain/repository/RefundsRepository';
import { CreateRefundUseCase, GetRefundDetailUseCase, GetRefundUseCase, ListRefundsUseCase } from '../../../../../core/feature/refunds/domain/usecase/RefundUseCases';

describe('Refund use cases', () => {
  it('validates detail identifiers before repository access', () => {
    const detail = vi.fn();
    const useCase = new GetRefundDetailUseCase({ detail } as unknown as RefundsRepository);
    expect(() => useCase.execute(0)).toThrow(/reembolso/);
    expect(() => useCase.execute(-1)).toThrow(/reembolso/);
    expect(detail).not.toHaveBeenCalled();
  });

  it('exposes GetRefund as the read-only detail use case', async () => {
    const detail = vi.fn().mockResolvedValue({});
    const useCase = new GetRefundUseCase({ detail } as unknown as RefundsRepository);
    await useCase.execute(10);
    expect(detail).toHaveBeenCalledWith(10, false);
  });

  it('blocks CreateRefund in the admin application', () => {
    expect(() => new CreateRefundUseCase().execute()).toThrow(/no está disponible/);
  });

  it('lists refunds through a read-only repository contract', async () => {
    const list = vi.fn().mockResolvedValue([]);
    const useCase = new ListRefundsUseCase({ list } as unknown as RefundsRepository);
    await expect(useCase.execute({ status: 'SHIPPED' })).resolves.toEqual([]);
    expect(list).toHaveBeenCalledWith({ status: 'SHIPPED' });
  });
});
