import { describe, expect, it, vi } from 'vitest';
import type { ReturnsRepository } from '../../../../../core/feature/returns/domain/repository/ReturnsRepository';
import { CreateReturnUseCase, GetReturnDetailUseCase, ListReturnReceiptsUseCase, ReceiveReturnLineUseCase } from '../../../../../core/feature/returns/domain/usecase/ReturnUseCases';

describe('Returns use cases', () => {
  it('rejects invalid RMA identifiers before repository access', () => {
    const detail = vi.fn();
    const useCase = new GetReturnDetailUseCase({ detail } as unknown as ReturnsRepository);
    expect(() => useCase.execute(0)).toThrow(/RMA/);
    expect(detail).not.toHaveBeenCalled();
  });

  it('validates receipt quantities and required idempotency key', async () => {
    const receive = vi.fn().mockResolvedValue({ receipt_id: 1, status: 'RECEIVED' });
    const useCase = new ReceiveReturnLineUseCase({ receive } as unknown as ReturnsRepository);
    const valid = { itemId: 3, quantity: 2, warehouseId: 1, binId: 9, idempotencyKey: 'retry-1' };
    expect(() => useCase.execute(7, { ...valid, quantity: 0 })).toThrow(/recepción/);
    expect(() => useCase.execute(7, { ...valid, idempotencyKey: ' ' })).toThrow(/recepción/);
    expect(receive).not.toHaveBeenCalled();
    await useCase.execute(7, valid);
    expect(receive).toHaveBeenCalledWith(7, valid);
  });

  it('validates the remaining shipped allowance before creating an RMA', async () => {
    const createReturn = vi.fn().mockResolvedValue({ so_id: 9, so_number: 'SO-1-RMA' });
    const repository = { createReturn } as unknown as ReturnsRepository;
    const useCase = new CreateReturnUseCase(repository);
    const available = {
      salesOrderId: 1, salesOrderNumber: 'SO-1', customerName: null, warehouseId: 1, status: 'SHIPPED',
      lines: [{ originalSalesOrderLineId: 11, itemId: 4, sku: 'A', itemName: 'A', quantityShipped: 4, quantityAlreadyAuthorized: 2, quantityRemaining: 2 }]
    };
    expect(() => useCase.execute(1, { lines: [{ originalSalesOrderLineId: 11, itemId: 4, quantity: 3 }] }, available)).toThrow(/supera/);
    expect(createReturn).not.toHaveBeenCalled();
    await useCase.execute(1, { lines: [{ originalSalesOrderLineId: 11, itemId: 4, quantity: 2 }] }, available);
    expect(createReturn).toHaveBeenCalledWith(1, { lines: [{ originalSalesOrderLineId: 11, itemId: 4, quantity: 2 }], memo: null });
  });

  it('lists the receipt history for a validated RMA', async () => {
    const receipts = vi.fn().mockResolvedValue([]);
    const useCase = new ListReturnReceiptsUseCase({ receipts } as unknown as ReturnsRepository);
    await expect(useCase.execute(12)).resolves.toEqual([]);
    expect(receipts).toHaveBeenCalledWith(12);
    expect(() => useCase.execute(-1)).toThrow(/RMA/);
  });
});
