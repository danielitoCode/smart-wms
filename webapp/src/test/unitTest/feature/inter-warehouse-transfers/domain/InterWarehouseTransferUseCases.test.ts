import { describe, expect, it, vi } from 'vitest';
import type { InterWarehouseTransfersRepository } from '../../../../../core/feature/inter-warehouse-transfers/domain/repository/InterWarehouseTransfersRepository';
import type { InterWarehouseTransfer } from '../../../../../core/feature/inter-warehouse-transfers/domain/entity/InterWarehouseTransfer';
import { CreateInterWarehouseTransferUseCase, ListInterWarehouseTransfersUseCase } from '../../../../../core/feature/inter-warehouse-transfers/domain/usecase/InterWarehouseTransferUseCases';

const transfer = (id: number, from: number, to: number): InterWarehouseTransfer => ({
  transferId: id, sourceWarehouseId: from, sourceWarehouseName: String(from), sourceWarehouseCode: String(from),
  sourceBinId: 10, sourceBinCode: 'A-01', destinationWarehouseId: to, destinationWarehouseName: String(to),
  destinationWarehouseCode: String(to), destinationBinId: 20, destinationBinCode: 'B-01',
  status: 'completed', lines: [{ itemId: 1, quantity: 2 }], transferredBy: 'operator', transferredAt: null
});

describe('InterWarehouseTransferUseCases', () => {
  it('filters history independently by source and destination warehouse', async () => {
    const repository = { list: vi.fn().mockResolvedValue([transfer(1, 1, 2), transfer(2, 2, 3), transfer(3, 1, 3)]), create: vi.fn() } as unknown as InterWarehouseTransfersRepository;
    const list = new ListInterWarehouseTransfersUseCase(repository);
    expect((await list.execute({ fromWarehouseId: 1 })).map(row => row.transferId)).toEqual([1, 3]);
    expect((await list.execute({ toWarehouseId: 3 })).map(row => row.transferId)).toEqual([2, 3]);
    expect((await list.execute({ fromWarehouseId: 1, toWarehouseId: 3 })).map(row => row.transferId)).toEqual([3]);
  });

  it('rejects invalid limits and warehouse filters', () => {
    const list = new ListInterWarehouseTransfersUseCase({ list: vi.fn(), create: vi.fn() } as unknown as InterWarehouseTransfersRepository);
    expect(() => list.execute({ limit: 501 })).toThrow();
    expect(() => list.execute({ fromWarehouseId: 0 })).toThrow();
    expect(() => list.execute({ toWarehouseId: 1.5 })).toThrow();
  });

  it('enforces positive integer IDs, distinct warehouses and server quantity bounds', async () => {
    const repository = { list: vi.fn(), create: vi.fn().mockResolvedValue(undefined) } as unknown as InterWarehouseTransfersRepository;
    const create = new CreateInterWarehouseTransferUseCase(repository);
    const valid = { itemId: 1, sourceBinId: 2, sourceWarehouseId: 3, destinationBinId: 4, destinationWarehouseId: 5, quantity: 100000 };
    await expect(create.execute(valid)).resolves.toBeUndefined();
    expect(() => create.execute({ ...valid, destinationWarehouseId: 3 })).toThrow();
    expect(() => create.execute({ ...valid, quantity: 100001 })).toThrow();
    expect(() => create.execute({ ...valid, quantity: 1.5 })).toThrow();
    expect(() => create.execute({ ...valid, itemId: Number.MAX_SAFE_INTEGER + 1 })).toThrow();
  });

  it('normalizes an empty reason before persistence', async () => {
    const repository = { list: vi.fn(), create: vi.fn().mockResolvedValue(undefined) } as unknown as InterWarehouseTransfersRepository;
    const create = new CreateInterWarehouseTransferUseCase(repository);
    await create.execute({ itemId: 1, sourceBinId: 2, sourceWarehouseId: 3, destinationBinId: 4, destinationWarehouseId: 5, quantity: 1, reason: '   ' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ reason: null }));
  });
});
