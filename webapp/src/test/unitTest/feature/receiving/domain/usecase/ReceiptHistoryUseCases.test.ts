import { describe, expect, it, vi } from 'vitest';
import { ListReceiptHistoryUseCase, UnreceiveReceiptUseCase } from '../../../../../../core/feature/receiving/domain/usecase/ReceiptHistoryUseCases';
import type { ReceivingRepository } from '../../../../../../core/feature/receiving/domain/repository/ReceivingRepository';

function repository(overrides: Partial<ReceivingRepository> = {}): ReceivingRepository {
  return {
    lookupByBarcode: vi.fn(), receive: vi.fn(), cancelReceipts: vi.fn(),
    listReceipts: vi.fn(), unreceive: vi.fn(), ...overrides
  };
}

describe('ListReceiptHistoryUseCase', () => {
  it('requires a positive PO id and returns the receipt history', async () => {
    const rows = [{ receiptId: 7, sku: 'SKU-7' }] as any;
    const repo = repository({ listReceipts: vi.fn().mockResolvedValue(rows) });
    const useCase = new ListReceiptHistoryUseCase(repo);
    await expect(useCase.execute(3)).resolves.toBe(rows);
    expect(repo.listReceipts).toHaveBeenCalledWith(3);
    expect(() => useCase.execute(0)).toThrow(/poId/);
  });
});

describe('UnreceiveReceiptUseCase', () => {
  it('sends a trimmed reason and validates the 500 character backend limit', async () => {
    const result = { receiptId: 9, quantityReversed: 2 } as any;
    const repo = repository({ unreceive: vi.fn().mockResolvedValue(result) });
    const useCase = new UnreceiveReceiptUseCase(repo);
    await expect(useCase.execute(9, '  double scan  ')).resolves.toBe(result);
    expect(repo.unreceive).toHaveBeenCalledWith(9, 'double scan');
    expect(() => useCase.execute(9, 'x'.repeat(501))).toThrow(/500/);
    expect(() => useCase.execute(0)).toThrow(/receiptId/);
  });

  it('omits an empty reason', async () => {
    const repo = repository({ unreceive: vi.fn().mockResolvedValue({} as any) });
    await new UnreceiveReceiptUseCase(repo).execute(2, '   ');
    expect(repo.unreceive).toHaveBeenCalledWith(2, undefined);
  });
});
