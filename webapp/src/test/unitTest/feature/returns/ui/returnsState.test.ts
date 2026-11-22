import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  list: { execute: vi.fn() },
  detail: { execute: vi.fn() },
  returnableOrder: { execute: vi.fn() },
  create: { execute: vi.fn() },
  receive: { execute: vi.fn() },
  voidReturn: { execute: vi.fn() },
  warehouses: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/returns/di/returns.dependencies', () => ({
  createReturnsDependencies: () => deps
}));

import { createReturnsState } from '../../../../../core/feature/returns/ui/state/returnsState.svelte';

const returnableOrder = {
  salesOrderId: 10,
  salesOrderNumber: 'SO-10',
  customerName: 'Customer',
  warehouseId: 2,
  status: 'SHIPPED',
  lines: [{ originalSalesOrderLineId: 101, itemId: 5, sku: 'SKU-5', itemName: 'Item 5', quantityShipped: 4, quantityAlreadyAuthorized: 1, quantityRemaining: 3 }]
};

function rma(id: number, voidedAt: string | null = null) {
  return {
    salesOrderId: id,
    salesOrderNumber: `RMA-${id}`,
    orderType: 'return',
    status: 'OPEN',
    parentSalesOrderId: 10,
    parentSalesOrderNumber: 'SO-10',
    lines: [],
    receipts: [],
    voidedAt,
    voidedBy: null
  };
}

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
};

describe('returnsState RMA safety and request ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.list.execute.mockResolvedValue([]);
    deps.detail.execute.mockImplementation(async (id: number) => rma(id));
    deps.returnableOrder.execute.mockResolvedValue(returnableOrder);
    deps.create.execute.mockResolvedValue({ so_id: 20, so_number: 'RMA-20' });
    deps.receive.execute.mockResolvedValue({ receipt_id: 1, status: 'PARTIALLY_RECEIVED' });
    deps.voidReturn.execute.mockResolvedValue(undefined);
    deps.warehouses.execute.mockResolvedValue([]);
  });

  it('blocks receipt and void actions for an already voided RMA', async () => {
    deps.detail.execute.mockResolvedValueOnce(rma(20, '2026-11-21T10:00:00Z'));
    const state = createReturnsState();
    await state.detail(20);

    expect(await state.receive(20, {
      itemId: 5, quantity: 1, warehouseId: 2, binId: 3, idempotencyKey: 'stable-key'
    })).toBe(false);
    expect(await state.voidReturn(20)).toBe(false);
    expect(deps.receive.execute).not.toHaveBeenCalled();
    expect(deps.voidReturn.execute).not.toHaveBeenCalled();
  });

  it('blocks a void action when the RMA already contains physical receipts', async () => {
    deps.detail.execute.mockResolvedValueOnce({ ...rma(20), receipts: [{ receiptId: 1 }] });
    const state = createReturnsState();
    await state.detail(20);

    expect(await state.voidReturn(20)).toBe(false);
    expect(deps.voidReturn.execute).not.toHaveBeenCalled();
  });

  it('does not retry RMA creation after an uncertain response in the same mounted session', async () => {
    deps.create.execute.mockRejectedValueOnce(new Error('request timed out'));
    const state = createReturnsState();
    await state.loadReturnableOrder(10);

    const lines = [{ itemId: 5, quantity: 1, originalSalesOrderLineId: 101 }];
    expect(await state.createReturn(lines, 'Customer return')).toBe(false);
    expect(state.createOutcomeUncertain).toBe(true);
    expect(await state.createReturn(lines, 'Customer return')).toBe(false);
    expect(deps.create.execute).toHaveBeenCalledTimes(1);
    expect(deps.returnableOrder.execute).toHaveBeenCalledTimes(2);
  });

  it('keeps the latest RMA detail when older detail requests resolve later', async () => {
    const first = deferred<ReturnType<typeof rma>>();
    const second = deferred<ReturnType<typeof rma>>();
    deps.detail.execute.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);

    const state = createReturnsState();
    const openingFirst = state.detail(20);
    const openingSecond = state.detail(21);

    second.resolve(rma(21));
    await openingSecond;
    first.resolve(rma(20));
    await openingFirst;

    expect(state.selected?.salesOrderId).toBe(21);
    expect(state.loading).toBe(false);
  });

  it('does not restore a detail after the operator closes it while the request is pending', async () => {
    const pending = deferred<ReturnType<typeof rma>>();
    deps.detail.execute.mockReturnValueOnce(pending.promise);

    const state = createReturnsState();
    const opening = state.detail(20);
    state.close();
    pending.resolve(rma(20));
    await opening;

    expect(state.selected).toBeNull();
  });
});
