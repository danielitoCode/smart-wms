import { describe, expect, it, vi } from 'vitest';
import { CreateTransferOrderUseCase, GetPickerTransferOrderUseCase, ListTransferOrdersUseCase, SubmitPickerResultUseCase } from '../../../../../core/feature/transfer-orders/domain/usecase/TransferOrderUseCases';
import type { TransferOrdersRepository } from '../../../../../core/feature/transfer-orders/domain/repository/TransferOrdersRepository';

function repository() {
  return {
    list: vi.fn().mockResolvedValue({ orders: [], total: 0, page: 1, pages: 1, perPage: 50 }),
    pickerDetail: vi.fn().mockResolvedValue({ transferOrderId: 12 }),
    create: vi.fn().mockResolvedValue({ toId: 12 }),
    submitPickerResult: vi.fn().mockResolvedValue({ approvalId: 8 })
  } as unknown as TransferOrdersRepository & Record<string, ReturnType<typeof vi.fn>>;
}

describe('Transfer Order use cases', () => {
  it('rejects invalid page and warehouse filters before reading', () => {
    const repo = repository();
    const useCase = new ListTransferOrdersUseCase(repo);
    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    expect(() => useCase.execute({ sourceWarehouseId: -1 })).toThrow(/sourceWarehouseId/);
    expect(() => useCase.execute({ destinationWarehouseId: 0 })).toThrow(/destinationWarehouseId/);
    expect(repo.list).not.toHaveBeenCalled();
  });

  it('rejects identical source and destination after trimming and case normalization', () => {
    const repo = repository();
    const useCase = new CreateTransferOrderUseCase(repo);
    expect(() => useCase.execute({ sourceWarehouseCode: ' wh-a ', destinationWarehouseCode: 'WH-A', records: [{ sku: 'SKU', quantity: 1 }] })).toThrow(/distintos/);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('rejects missing lines and invalid quantities before import', () => {
    const repo = repository();
    const useCase = new CreateTransferOrderUseCase(repo);
    expect(() => useCase.execute({ sourceWarehouseCode: 'A', destinationWarehouseCode: 'B', records: [] })).toThrow(/al menos una línea/);
    expect(() => useCase.execute({ sourceWarehouseCode: 'A', destinationWarehouseCode: 'B', records: [{ sku: 'SKU', quantity: 0 }] })).toThrow(/Cantidad inválida/);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('validates identifiers for picker read and submit operations', async () => {
    const repo = repository();
    const picker = new GetPickerTransferOrderUseCase(repo);
    const submit = new SubmitPickerResultUseCase(repo);
    expect(() => picker.execute(0)).toThrow(/transferOrderId/);
    expect(() => submit.execute(-3)).toThrow(/transferOrderId/);
    await picker.execute(12);
    await submit.execute(12);
    expect(repo.pickerDetail).toHaveBeenCalledWith(12);
    expect(repo.submitPickerResult).toHaveBeenCalledWith(12);
  });
});
