import { beforeEach, describe, expect, it, vi } from 'vitest';

const deps = vi.hoisted(() => ({
  searchCustomers: { execute: vi.fn() },
  listCustomers: { execute: vi.fn() },
  getCustomerDetail: { execute: vi.fn() },
  getCustomerOrders: { execute: vi.fn() }
}));

vi.mock('../../../../../core/feature/customers/di/customers.dependencies', () => ({
  createCustomersDependencies: () => deps
}));

import { createCustomersState } from '../../../../../core/feature/customers/ui/state/customersState.svelte';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const page = (name: string) => ({
  customers: [{ id: name.toLowerCase(), name, email: null, phone: null, orderCount: 1, warehouseIds: [1], addresses: [] }],
  page: 1, perPage: 50, totalOrders: 1, totalPages: 1
});

describe('Customers UI state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deps.listCustomers.execute.mockResolvedValue(page('Warehouse One'));
    deps.searchCustomers.execute.mockResolvedValue([]);
    deps.getCustomerDetail.execute.mockResolvedValue(null);
    deps.getCustomerOrders.execute.mockResolvedValue({ orders: [], page: 1, perPage: 50, matchingSalesOrders: 0, totalPages: 1 });
  });

  it('invalidates an older list response immediately when warehouse changes', async () => {
    const state = createCustomersState();
    const oldRequest = deferred<ReturnType<typeof page>>();
    deps.listCustomers.execute.mockReturnValueOnce(oldRequest.promise);
    state.setWarehouseId(1);
    const first = state.load(1);
    state.setWarehouseId(2);
    await state.load(1);
    oldRequest.resolve(page('Stale warehouse'));
    await first;
    expect(state.customers).toEqual(page('Warehouse One').customers);
    expect(state.warehouseId).toBe(2);
    expect(state.loading).toBe(false);
  });

  it('clears selected customer and order history when warehouse changes', async () => {
    const state = createCustomersState();
    state.setWarehouseId(1);
    await state.load(1);
    await state.selectCustomer(state.customers[0]);
    expect(state.selectedCustomer).not.toBeNull();
    state.setWarehouseId(2);
    expect(state.selectedCustomer).toBeNull();
    expect(state.customerOrders).toBeNull();
    expect(state.customers).toEqual([]);
    expect(state.customerPage).toBeNull();
  });

  it('does not allow a late customer detail response to repopulate a new warehouse context', async () => {
    const state = createCustomersState();
    state.setWarehouseId(1);
    await state.load(1);
    const detail = deferred<null>();
    deps.getCustomerDetail.execute.mockReturnValueOnce(detail.promise);
    const selecting = state.selectCustomer(state.customers[0]);
    state.setWarehouseId(2);
    detail.resolve(null);
    await selecting;
    expect(state.selectedCustomer).toBeNull();
    expect(state.customerOrders).toBeNull();
  });

  it('keeps the newest search result when an older query resolves last', async () => {
    const state = createCustomersState();
    const oldSearch = deferred<ReturnType<typeof page>['customers']>();
    state.setWarehouseId(1);
    state.setQuery('first');
    deps.searchCustomers.execute.mockReturnValueOnce(oldSearch.promise);
    const first = state.load(1);
    state.setQuery('second');
    deps.searchCustomers.execute.mockResolvedValueOnce(page('Second query').customers);
    await state.load(1);
    oldSearch.resolve(page('First query').customers);
    await first;
    expect(state.customers.map((customer) => customer.name)).toEqual(['Second query']);
    expect(state.loading).toBe(false);
  });

});
