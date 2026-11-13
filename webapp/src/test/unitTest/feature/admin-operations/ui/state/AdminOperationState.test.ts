import { beforeEach, describe, expect, it, vi } from 'vitest';

const { execute } = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock('../../../../../../core/feature/admin-operations/di/adminOperations.dependencies', () => ({
  createAdminOperationsDependencies: () => ({ list: { execute } })
}));

vi.mock('../../../../../../core/infrastructure/errors/ApiError', () => ({
  toUserMessage: (_cause: unknown, fallback: string) => fallback
}));

import { createAdminOperationState } from '../../../../../../core/feature/admin-operations/ui/state/adminOperationState.svelte';

function result(id: number) {
  return {
    feature: 'backorders' as const,
    rows: [{
      feature: 'backorders' as const,
      id,
      data: {
        salesOrderNumber: `SO-${id}`,
        parentSalesOrderNumber: null,
        customerName: null,
        status: 'WAITING_STOCK',
        daysWaiting: 2,
        items: []
      }
    }],
    summary: null,
    pagination: null
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('AdminOperationState request lifecycle', () => {
  beforeEach(() => execute.mockReset());

  it('discards an older response after a warehouse change starts a newer request', async () => {
    const first = deferred<ReturnType<typeof result>>();
    const second = deferred<ReturnType<typeof result>>();
    execute
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const state = createAdminOperationState('backorders');

    const firstLoad = state.load({ warehouseId: 1 });
    const secondLoad = state.load({ warehouseId: 2 });

    expect(state.loading).toBe(true);
    expect(execute).toHaveBeenNthCalledWith(1, 'backorders', expect.objectContaining({ warehouseId: 1 }));
    expect(execute).toHaveBeenNthCalledWith(2, 'backorders', expect.objectContaining({ warehouseId: 2 }));

    second.resolve(result(2));
    await expect(secondLoad).resolves.toBe(true);
    first.resolve(result(1));
    await expect(firstLoad).resolves.toBe(false);

    expect(state.rows[0]?.id).toBe(2);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('keeps the latest error when an older request finishes afterwards', async () => {
    const older = deferred<ReturnType<typeof result>>();
    execute
      .mockReturnValueOnce(older.promise)
      .mockRejectedValueOnce(new Error('warehouse request failed'));
    const state = createAdminOperationState('backorders');

    const oldLoad = state.load({ warehouseId: 1 });
    await expect(state.load({ warehouseId: 2 })).resolves.toBe(false);
    const latestError = state.error;

    older.resolve(result(1));
    await expect(oldLoad).resolves.toBe(false);

    expect(state.error).toBe(latestError);
    expect(state.rows).toHaveLength(0);
    expect(state.loading).toBe(false);
  });

  it('clears the previous error and restores data after a successful retry', async () => {
    execute
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(result(4));
    const state = createAdminOperationState('backorders');

    await expect(state.load()).resolves.toBe(false);
    expect(state.error).toBe('No se pudieron cargar los datos del módulo');

    await expect(state.load()).resolves.toBe(true);
    expect(state.error).toBeNull();
    expect(state.rows[0]?.id).toBe(4);
    expect(state.loading).toBe(false);
  });
});
