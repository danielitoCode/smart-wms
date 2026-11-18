import { describe, expect, it, vi } from 'vitest';
import type { FraudReviewRepository } from '../../../../../core/feature/fraud/domain/repository/FraudReviewRepository';
import {
  ListFraudReviewsUseCase,
  GetFraudReviewDetailUseCase,
  PushFraudOrderToQueueUseCase,
  UpdateFraudMemoUseCase
} from '../../../../../core/feature/fraud/domain/usecase/FraudReviewUseCases';

function repository() {
  return {
    list: vi.fn().mockResolvedValue([]),
    getDetail: vi.fn().mockResolvedValue({ order: {}, lines: [] }),
    updateMemo: vi.fn().mockResolvedValue(undefined),
    pushToQueue: vi.fn().mockResolvedValue(undefined)
  } as unknown as FraudReviewRepository;
}

describe('Fraud review use cases', () => {
  it('delegates the fraud queue query with the selected warehouse', async () => {
    const repo = repository();
    await new ListFraudReviewsUseCase(repo).execute(7);
    expect(repo.list).toHaveBeenCalledWith(7, '');
  });

  it('delegates detail retrieval by sales-order ID', async () => {
    const repo = repository();
    await new GetFraudReviewDetailUseCase(repo).execute(12);
    expect(repo.getDetail).toHaveBeenCalledWith(12);
  });

  it('accepts the backend memo limit and forwards an empty string to clear it', async () => {
    const repo = repository();
    const useCase = new UpdateFraudMemoUseCase(repo);
    const memo = 'x'.repeat(4000);

    await expect(useCase.execute(12, memo)).resolves.toBeUndefined();
    await expect(useCase.execute(12, '')).resolves.toBeUndefined();

    expect(repo.updateMemo).toHaveBeenNthCalledWith(1, 12, memo);
    expect(repo.updateMemo).toHaveBeenNthCalledWith(2, 12, '');
  });

  it('rejects memos longer than the Flask schema limit before making a request', async () => {
    const repo = repository();
    const useCase = new UpdateFraudMemoUseCase(repo);

    expect(() => useCase.execute(12, 'x'.repeat(4001))).toThrow(
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
