import { CancelSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CancelSalesOrderUseCase';
import { UpdateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/UpdateSalesOrderUseCase';
import {
  AddSalesOrderLineUseCase, UpdateSalesOrderLineUseCase, DeleteSalesOrderLineUseCase
} from '../../../../../../core/feature/sales-orders/domain/usecase/ManageSalesOrderLinesUseCase';
import {
  AdminPickSalesOrderUseCase, PartialFulfillSalesOrderUseCase, RevertSalesOrderStatusUseCase
} from '../../../../../../core/feature/sales-orders/domain/usecase/FulfillSalesOrderUseCases';
import {
  ReceiveSalesOrderReturnUseCase, VoidSalesOrderReturnUseCase
} from '../../../../../../core/feature/sales-orders/domain/usecase/ManageSalesOrderReturnsUseCases';
import { describe, expect, it, vi } from 'vitest';
import { CreateSalesOrderUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/CreateSalesOrderUseCase';
import { AdminShipSalesOrderUseCase, GetAvailableSalesOrderBinsUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/FulfillSalesOrderUseCases';
import { UpdateSalesOrderAllocationUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/UpdateSalesOrderAllocationUseCase';
import { ListSalesOrdersUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ListSalesOrdersUseCase';
import type { SalesOrderRepository } from '../../../../../../core/feature/sales-orders/domain/repository/SalesOrderRepository';
import type { SalesOrderPage } from '../../../../../../core/feature/sales-orders/domain/entity/SalesOrder';

describe('Sales order use cases', () => {
  it('validates pagination and search before listing', async () => {
    const page: SalesOrderPage = {
      items: [],
      total: 0,
      page: 1,
      perPage: 50,
      pages: 1
    };
    const listPage = vi.fn().mockResolvedValue(page);
    const repository = { listPage } as unknown as SalesOrderRepository;
    const useCase = new ListSalesOrdersUseCase(repository);

    expect(() => useCase.execute({ page: 0 })).toThrow(/page/);
    await useCase.execute({ q: ' SO-1 ' });
    expect(listPage).toHaveBeenCalledWith({
      q: 'SO-1',
      status: undefined,
      warehouseId: undefined,
      page: undefined,
      perPage: undefined,
      excludePostFulfillment: false,
      orderType: undefined,
      hidePrinted: false,
      includePrimaryBin: false,
      includeLineCount: false,
      localPickup: false
    });
  });

  it('validates identifiers before looking up available picking bins', async () => {
    const getAvailableBins = vi.fn().mockResolvedValue([]);
    const useCase = new GetAvailableSalesOrderBinsUseCase({
      getAvailableBins
    } as unknown as SalesOrderRepository);

    expect(() => useCase.execute(0, 10)).toThrow(/identificador del pedido/);
    expect(() => useCase.execute(10, 0)).toThrow(/identificador de la línea/);
    await useCase.execute(10, 20);
    expect(getAvailableBins).toHaveBeenCalledWith(10, 20);
  });

  it('requires a number, warehouse and unique positive item lines', () => {
    const create = vi.fn();
    const useCase = new CreateSalesOrderUseCase({ create } as unknown as SalesOrderRepository);
    expect(() => useCase.execute({
      soNumber: ' ', warehouseId: 1, lines: [{ itemId: 1, quantityOrdered: 1 }]
    })).toThrow(/soNumber/);
    expect(() => useCase.execute({
      soNumber: 'SO-1', warehouseId: 1,
      lines: [{ itemId: 1, quantityOrdered: 1 }, { itemId: 1, quantityOrdered: 2 }]
    })).toThrow(/duplicate/);
    expect(create).not.toHaveBeenCalled();
  });
  it('passes the explicit silent-shortfall acknowledgement to admin ship', async () => {
    const adminShip = vi.fn().mockResolvedValue({
      fulfillmentId: 5, linesShipped: 2, totalQuantity: 8
    });
    const useCase = new AdminShipSalesOrderUseCase({
      adminShip
    } as unknown as SalesOrderRepository);

    await expect(useCase.execute(7, true)).resolves.toEqual({
      fulfillmentId: 5, linesShipped: 2, totalQuantity: 8
    });
    expect(adminShip).toHaveBeenCalledWith(7, true);
  });

  it('validates allocation delta and returns the actual server allocation result', async () => {
    const updateAllocation = vi.fn().mockResolvedValue({
      soLineId: 20, quantityAllocated: 3, unchanged: false
    });
    const useCase = new UpdateSalesOrderAllocationUseCase({
      updateAllocation
    } as unknown as SalesOrderRepository);

    expect(() => useCase.execute(7, 20, { delta: 1_000_001 })).toThrow(/ajuste de asignación/);
    expect(() => useCase.execute(7, 0, { delta: 1 })).toThrow(/línea/);
    await expect(useCase.execute(7, 20, { delta: 5 })).resolves.toEqual({
      soLineId: 20, quantityAllocated: 3, unchanged: false
    });
    expect(updateAllocation).toHaveBeenCalledWith(7, 20, { delta: 5 });
  });

});


import { CreateSalesOrderRmaUseCase } from '../../../../../../core/feature/sales-orders/domain/usecase/ManageSalesOrderReturnsUseCases';

describe('CreateSalesOrderRmaUseCase', () => {
  it('requires a valid source order and at least one authorization line', () => {
    const createRma = vi.fn();
    const useCase = new CreateSalesOrderRmaUseCase({ createRma } as unknown as SalesOrderRepository);
    const line = { itemId: 10, quantity: 1, originalSoLineId: 100 };

    expect(() => useCase.execute(0, { lines: [line] })).toThrow(/pedido/);
    expect(() => useCase.execute(12, { lines: [] })).toThrow(/al menos una línea/);
    expect(createRma).not.toHaveBeenCalled();
  });

  it('rejects invalid or unlinked authorization lines before repository access', () => {
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

  it('rejects duplicate source lines but permits distinct lines for the same item', async () => {
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


describe('Sales order mutation use cases', () => {
  it('validates and delegates cancellation by order id', async () => {
    const cancel = vi.fn().mockResolvedValue(undefined);
    const useCase = new CancelSalesOrderUseCase({ cancel } as unknown as SalesOrderRepository);
    expect(() => useCase.execute(0)).toThrow(/id/);
    await useCase.execute(41);
    expect(cancel).toHaveBeenCalledWith(41);
  });

  it('validates header updates and accepts only backend-supported priority values', async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const useCase = new UpdateSalesOrderUseCase({ update } as unknown as SalesOrderRepository);
    expect(() => useCase.execute(0, { memo: 'x' })).toThrow(/identificador/);
    expect(() => useCase.execute(41, {})).toThrow(/al menos un campo/);
    expect(() => useCase.execute(41, { salesOrderNumber: '  ' })).toThrow(/no puede quedar vacío/);
    expect(() => useCase.execute(41, { priority: 11 })).toThrow(/0 y 10/);
    await useCase.execute(41, { memo: 'updated', priority: 4 });
    expect(update).toHaveBeenCalledWith(41, { memo: 'updated', priority: 4 });
  });

  it('validates line add, update and delete before repository access', async () => {
    const addLine = vi.fn().mockResolvedValue(undefined);
    const updateLine = vi.fn().mockResolvedValue(undefined);
    const deleteLine = vi.fn().mockResolvedValue(undefined);
    const repository = { addLine, updateLine, deleteLine } as unknown as SalesOrderRepository;
    const add = new AddSalesOrderLineUseCase(repository);
    const update = new UpdateSalesOrderLineUseCase(repository);
    const remove = new DeleteSalesOrderLineUseCase(repository);

    expect(() => add.execute(41, 0, 1)).toThrow(/identificadores/);
    expect(() => add.execute(41, 7, 0)).toThrow(/cantidad/);
    expect(() => update.execute(41, 9, 1_000_001)).toThrow(/cantidad/);
    expect(() => remove.execute(41, -1)).toThrow(/identificadores/);
    await add.execute(41, 7, 3);
    await update.execute(41, 9, 4);
    await remove.execute(41, 9);
    expect(addLine).toHaveBeenCalledWith(41, { itemId: 7, quantityOrdered: 3 });
    expect(updateLine).toHaveBeenCalledWith(41, 9, 4);
    expect(deleteLine).toHaveBeenCalledWith(41, 9);
  });

  it('validates admin picks and partial fulfillment quantities', async () => {
    const adminPick = vi.fn().mockResolvedValue(undefined);
    const partialFulfill = vi.fn().mockResolvedValue(undefined);
    const repository = { adminPick, partialFulfill } as unknown as SalesOrderRepository;
    const pick = new AdminPickSalesOrderUseCase(repository);
    const partial = new PartialFulfillSalesOrderUseCase(repository);

    expect(() => pick.execute(41, [])).toThrow(/al menos una asignación/);
    expect(() => pick.execute(41, [{ soLineId: 9, binId: 0, quantity: 1 }])).toThrow(/ubicación/);
    expect(() => partial.execute(41, { lines: [] })).toThrow(/faltante/);
    expect(() => partial.execute(41, {
      lines: [{ soLineId: 9, shortQuantity: 0 }]
    })).toThrow(/faltantes/);

    await pick.execute(41, [{ soLineId: 9, binId: 3, quantity: 2 }]);
    await partial.execute(41, {
      lines: [{ soLineId: 9, shortQuantity: 1 }],
      reason: 'damaged'
    });
    expect(adminPick).toHaveBeenCalledWith(41, [{ soLineId: 9, binId: 3, quantity: 2 }]);
    expect(partialFulfill).toHaveBeenCalledWith(41, {
      lines: [{ soLineId: 9, shortQuantity: 1 }],
      reason: 'damaged'
    });
  });

  it('validates status reversion and release-task identifiers', async () => {
    const revertStatus = vi.fn().mockResolvedValue(undefined);
    const useCase = new RevertSalesOrderStatusUseCase({
      revertStatus
    } as unknown as SalesOrderRepository);
    expect(() => useCase.execute(41, { newStatus: ' ', releasePickTaskIds: [] })).toThrow(/estado/);
    expect(() => useCase.execute(41, {
      newStatus: 'OPEN', releasePickTaskIds: [0]
    })).toThrow(/tareas/);
    await useCase.execute(41, { newStatus: 'OPEN', releasePickTaskIds: [101] });
    expect(revertStatus).toHaveBeenCalledWith(41, {
      newStatus: 'OPEN', releasePickTaskIds: [101]
    });
  });

  it('validates return receipt identifiers and delegates voiding', async () => {
    const receiveReturn = vi.fn().mockResolvedValue(undefined);
    const voidReturn = vi.fn().mockResolvedValue(undefined);
    const repository = { receiveReturn, voidReturn } as unknown as SalesOrderRepository;
    const receive = new ReceiveSalesOrderReturnUseCase(repository);
    const voidRma = new VoidSalesOrderReturnUseCase(repository);

    expect(() => receive.execute(41, {
      itemId: 7, quantity: 1, warehouseId: 0, binId: 8
    })).toThrow(/Artículo/);
    await receive.execute(41, {
      itemId: 7, quantity: 1, warehouseId: 2, binId: 8,
      notes: 'checked', idempotencyKey: 'receive-1'
    });
    expect(receiveReturn).toHaveBeenCalledWith(41, {
      itemId: 7, quantity: 1, warehouseId: 2, binId: 8,
      notes: 'checked', idempotencyKey: 'receive-1'
    });
    expect(() => voidRma.execute(0)).toThrow(/identificador/);
    await voidRma.execute(41);
    expect(voidReturn).toHaveBeenCalledWith(41);
  });
});
