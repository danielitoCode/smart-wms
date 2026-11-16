import { describe, expect, it, vi } from 'vitest';
import type { ReturnsRepository } from '../../../../../core/feature/returns/domain/repository/ReturnsRepository';
import { GetReturnDetailUseCase, ListReturnReceiptsUseCase, ReceiveReturnLineUseCase } from '../../../../../core/feature/returns/domain/usecase/ReturnUseCases';

describe('Returns use cases', () => {
  it('rejects invalid RMA identifiers before repository access', async () => {
    const detail = vi.fn();
    const useCase = new GetReturnDetailUseCase({ detail } as unknown as ReturnsRepository);
    expect(() => useCase.execute(0)).toThrow(/RMA/);
    expect(detail).not.toHaveBeenCalled();
  });

  it('validates receipt quantities and required idempotency key', async () => {
    const receive = vi.fn();
    const useCase = new ReceiveReturnLineUseCase({ receive } as unknown as ReturnsRepository);
    const valid = { itemId: 3, quantity: 2, warehouseId: 1, binId: 9, idempotencyKey: 'retry-1' };
    expect(() => useCase.execute(7, { ...valid, quantity: 0 })).toThrow(/recepción/);
    expect(() => useCase.execute(7, { ...valid, idempotencyKey: ' ' })).toThrow(/recepción/);
    expect(receive).not.toHaveBeenCalled();
    await useCase.execute(7, valid);
    expect(receive).toHaveBeenCalledWith(7, valid);
  });

  it('lists the receipt history for a validated RMA', async () => {
    const receipts = vi.fn().mockResolvedValue([]);
    const useCase = new ListReturnReceiptsUseCase({ receipts } as unknown as ReturnsRepository);
    await expect(useCase.execute(12)).resolves.toEqual([]);
    expect(receipts).toHaveBeenCalledWith(12);
    expect(() => useCase.execute(-1)).toThrow(/RMA/);
  });
});
