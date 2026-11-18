import { describe, expect, it, vi } from 'vitest';
import type { FraudReviewRepository } from '../../../../../../core/feature/fraud/domain/repository/FraudReviewRepository';
import {
  ListFraudReviewsUseCase,
  GetFraudAuditHistoryUseCase,
  GetFraudReviewDetailUseCase,
  PushFraudOrderToQueueUseCase,
  UpdateFraudMemoUseCase
} from '../../../../../../core/feature/fraud/domain/usecase/FraudReviewUseCases';

function repository() {
  return {
    list: vi.fn().mockResolvedValue({ items: [], page: 1, perPage: 50, total: 0, pages: 1 }),
    getDetail: vi.fn().mockResolvedValue({ order: {}, lines: [] }),
    getAuditHistory: vi.fn().mockResolvedValue({ entries: [], page: 1, perPage: 20, total: 0, pages: 1 }),
    updateMemo: vi.fn().mockResolvedValue(undefined),
    pushToQueue: vi.fn().mockResolvedValue(undefined)
  } as unknown as FraudReviewRepository;
}

describe('Fraud review use cases', () => {
  it('delegates the paginated fraud queue query with the selected warehouse', async () => {
    const repo = repository();
    await new ListFraudReviewsUseCase(repo).execute(7, ' SO-7 ', 2);
    expect(repo.list).toHaveBeenCalledWith(7, 'SO-7', 2);
  });

  it('delegates detail retrieval by sales-order ID', async () => {
    const repo = repository();
    await new GetFraudReviewDetailUseCase(repo).execute(12);
    expect(repo.getDetail).toHaveBeenCalledWith(12);
  });

  it('validates and delegates audit-history pagination', async () => {
    const repo = repository();
    await new GetFraudAuditHistoryUseCase(repo).execute(12, 3);
    expect(repo.getAuditHistory).toHaveBeenCalledWith(12, 3);
    expect(() => new GetFraudAuditHistoryUseCase(repo).execute(12, 0)).toThrow('Página no válida');
  });

  it('accepts the backend memo limit and forwards expected memo for optimistic concurrency', async () => {
    const repo = repository();
    const useCase = new UpdateFraudMemoUseCase(repo);
    const memo = 'x'.repeat(4000);

    await expect(useCase.execute(12, memo, 'previous')).resolves.toBeUndefined();
    await expect(useCase.execute(12, '', null)).resolves.toBeUndefined();

    expect(repo.updateMemo).toHaveBeenNthCalledWith(1, 12, memo, 'previous');
    expect(repo.updateMemo).toHaveBeenNthCalledWith(2, 12, '', null);
  });

  it('rejects memos longer than the Flask schema limit before making a request', async () => {
    const repo = repository();
    const useCase = new UpdateFraudMemoUseCase(repo);

    expect(() => useCase.execute(12, 'x'.repeat(4001), null)).toThrow(
      'La observación supera el límite permitido'
    );
    expect(repo.updateMemo).not.toHaveBeenCalled();
  });

  it('delegates push-to-queue once for the selected order', async () => {
    const repo = repository();
    await new PushFraudOrderToQueueUseCase(repo).execute(12);
    expect(repo.pushToQueue).toHaveBeenCalledTimes(1);
    expect(repo.pushToQueue).toHaveBeenCalledWith(12);
  });
});
