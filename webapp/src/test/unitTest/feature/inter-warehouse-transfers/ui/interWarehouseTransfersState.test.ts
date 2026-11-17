import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listTransfers: vi.fn(), createTransfer: vi.fn(),
  listWarehouses: vi.fn(), searchBins: vi.fn(),
  searchItems: vi.fn()
}));

vi.mock('../../../../../core/feature/inter-warehouse-transfers/di/interWarehouseTransfers.dependencies', () => ({
  createInterWarehouseTransfersDependencies: () => ({
    list: { execute: mocks.listTransfers }, create: { execute: mocks.createTransfer }
  })
}));
vi.mock('../../../../../core/feature/warehouses/di/warehouses.dependencies', () => ({
  createWarehousesDependencies: () => ({
    listWarehouses: { execute: mocks.listWarehouses },
    searchOperationalBins: { execute: mocks.searchBins }
  })
}));
vi.mock('../../../../../core/feature/items/di/items.dependencies', () => ({
  createItemsDependencies: () => ({ searchItems: { execute: mocks.searchItems } })
}));

import { createInterWarehouseTransfersState } from '../../../../../core/feature/inter-warehouse-transfers/ui/state/interWarehouseTransfersState.svelte';

const warehouse = (id: number) => ({ id, code: 'WH-' + id, name: 'Warehouse ' + id, address: null, active: true, createdAt: null });
const bin = (id: number, warehouseId: number) => ({
  id, warehouseId, code: 'BIN-' + id, barcode: null, binType: 'Pickable' as const,
  zoneName: 'Storage', aisle: null, rowNumber: null, levelNumber: null
});
const item = (id: number, active = true) => ({
  id, sku: 'SKU-' + id, name: 'Item ' + id, description: null, upc: null, mpn: null,
  barcodeAliases: [], category: null, weightLbs: null, lengthIn: null, widthIn: null, heightIn: null,
  defaultBinId: null, defaultBinCode: null, reorderPoint: null, reorderQty: null,
  isLotTracked: false, isSerialTracked: false, active, createdAt: null, updatedAt: null
});

describe('inter-warehouse transfer selectors and state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listTransfers.mockResolvedValue([]);
    mocks.createTransfer.mockResolvedValue(undefined);
    mocks.listWarehouses.mockResolvedValue([warehouse(1), warehouse(2), warehouse(3)]);
    mocks.searchBins.mockImplementation(async (_query: string, warehouseId: number) => [bin(10, warehouseId), bin(99, 99)]);
    mocks.searchItems.mockResolvedValue([item(1), item(2, false)]);
  });

  it('loads active authorized warehouses and sends both history filters to the list use case', async () => {
    const state = createInterWarehouseTransfersState();
    await state.load();
    expect(state.warehouses.map(row => row.id)).toEqual([1, 2, 3]);
    state.setFromWarehouseFilter('1');
    state.setToWarehouseFilter('2');
    await vi.waitFor(() => expect(mocks.listTransfers).toHaveBeenLastCalledWith({
      limit: 500, fromWarehouseId: 1, toWarehouseId: 2
    }));
  });

  it('searches source and destination bins independently and discards results outside the selected warehouse', async () => {
    const state = createInterWarehouseTransfersState();
    await state.searchBins('source', 'A-', 1);
    await state.searchBins('destination', 'B-', 2);
    expect(mocks.searchBins).toHaveBeenNthCalledWith(1, 'A-', 1);
    expect(mocks.searchBins).toHaveBeenNthCalledWith(2, 'B-', 2);
    expect(state.sourceBins.map(row => row.warehouseId)).toEqual([1]);
    expect(state.destinationBins.map(row => row.warehouseId)).toEqual([2]);
  });

  it('does not search bins without a selected warehouse or a query', async () => {
    const state = createInterWarehouseTransfersState();
    await state.searchBins('source', 'A-', 0);
    await state.searchBins('destination', '  ', 2);
    expect(mocks.searchBins).not.toHaveBeenCalled();
    expect(state.sourceBins).toEqual([]);
    expect(state.destinationBins).toEqual([]);
  });

  it('offers only active items from product search', async () => {
    const state = createInterWarehouseTransfersState();
    await state.searchItems('SKU');
    expect(mocks.searchItems).toHaveBeenCalledWith('SKU');
    expect(state.itemResults.map(row => row.id)).toEqual([1]);
    await state.searchItems('x');
    expect(state.itemResults).toEqual([]);
    expect(mocks.searchItems).toHaveBeenCalledTimes(1);
  });

  it('blocks duplicate submissions and refreshes the movement history after success', async () => {
    const state = createInterWarehouseTransfersState();
    let release!: () => void;
    mocks.createTransfer.mockReturnValueOnce(new Promise<void>(resolve => { release = resolve; }));
    const payload = {
      itemId: 1, sourceWarehouseId: 1, sourceBinId: 10,
      destinationWarehouseId: 2, destinationBinId: 20,
      quantity: 3, idempotencyKey: '550e8400-e29b-41d4-a716-446655440000'
    };
    const first = state.create(payload);
    expect(await state.create(payload)).toBe(false);
    expect(mocks.createTransfer).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toBe(true);
    expect(mocks.listTransfers).toHaveBeenCalled();
  });
});
