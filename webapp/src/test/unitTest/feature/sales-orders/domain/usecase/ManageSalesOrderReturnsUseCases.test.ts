import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderRmaUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ManageSalesOrderReturnsUseCases';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';

describe('CreateSalesOrderRmaUseCase', () => {
  it('requires a valid source order and at least one authorization line', () => {
    const createRma = vi.fn();
    const useCase = new CreateSalesOrderRmaUseCase({ createRma } as unknown as SalesOrderRepository);
    const line = { itemId: 10, quantity: 1, originalSoLineId: 100 };

    expect(() => useCase.execute(0, { lines: [line] })).toThrow(/pedido/);
    expect(() => useCase.execute(12, { lines: [] })).toThrow(/al menos una línea/);
    expect(createRma).not.toHaveBeenCalled();
  });

  it('rejects invalid or unlinked authorization lines before calling the repository', () => {
    const createRma = vi.fn();
    const useCase = new CreateSalesOrderRmaUseCase({ createRma } as unknown as SalesOrderRepository);

    expect(() => useCase.execute(12, {
      lines: [{ itemId: 10, quantity: 1, originalSoLineId: 0 }]
    })).toThrow(/línea original/);
    expect(() => useCase.execute(12, {
      lines: [{ itemId: 10, quantity: 0, originalSoLineId: 100 }]
    })).toThrow(/línea original/);
    expect(createRma).not.toHaveBeenCalled();
  });

  it('rejects duplicate source lines but allows distinct lines for the same item', async () => {
    const createRma = vi.fn().mockResolvedValue(undefined);
    const useCase = new CreateSalesOrderRmaUseCase({ createRma } as unknown as SalesOrderRepository);

    expect(() => useCase.execute(12, {
      lines: [
        { itemId: 10, quantity: 1, originalSoLineId: 100 },
        { itemId: 10, quantity: 1, originalSoLineId: 100 }
      ]
    })).toThrow(/duplicar/);
    expect(createRma).not.toHaveBeenCalled();

    const input = {
      lines: [
        { itemId: 10, quantity: 1, originalSoLineId: 100 },
        { itemId: 10, quantity: 2, originalSoLineId: 101 }
      ],
      reason: 'Producto dañado'
    };
    await expect(useCase.execute(12, input)).resolves.toBeUndefined();
    expect(createRma).toHaveBeenCalledWith(12, input);
  });

  it('enforces the backend memo limit', () => {
    const createRma = vi.fn();
    const useCase = new CreateSalesOrderRmaUseCase({ createRma } as unknown as SalesOrderRepository);
    expect(() => useCase.execute(12, {
      lines: [{ itemId: 10, quantity: 1, originalSoLineId: 100 }],
      reason: 'x'.repeat(4001)
    })).toThrow(/4000/);
    expect(createRma).not.toHaveBeenCalled();
  });
});
