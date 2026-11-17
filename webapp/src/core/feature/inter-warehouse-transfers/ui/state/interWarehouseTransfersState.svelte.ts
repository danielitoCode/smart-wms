import { createInterWarehouseTransfersDependencies } from '../../di/interWarehouseTransfers.dependencies';
import { createWarehousesDependencies } from '../../../warehouses/di/warehouses.dependencies';
import { createItemsDependencies } from '../../../items/di/items.dependencies';
import type { InterWarehouseTransfer, RecordInterWarehouseTransfer } from '../../domain/entity/InterWarehouseTransfer';
import type { Warehouse, OperationalBinSearchResult } from '../../../warehouses/domain/entity/Warehouse';
import type { Item } from '../../../items/domain/entity/Item';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createInterWarehouseTransfersDependencies();
const warehousesDependencies = createWarehousesDependencies();
const itemsDependencies = createItemsDependencies();

export function createInterWarehouseTransfersState() {
  let rows = $state<InterWarehouseTransfer[]>([]);
  let warehouses = $state<Warehouse[]>([]);
  let sourceBins = $state<OperationalBinSearchResult[]>([]);
  let destinationBins = $state<OperationalBinSearchResult[]>([]);
  let itemResults = $state<Item[]>([]);
  let sourceBinSearching = $state(false);
  let destinationBinSearching = $state(false);
  let itemSearching = $state(false);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let fromWarehouseFilter = $state('');
  let toWarehouseFilter = $state('');
  let listEpoch = 0;
  let sourceBinEpoch = 0;
  let destinationBinEpoch = 0;
  let itemEpoch = 0;

  async function load() {
    const epoch = ++listEpoch;
    loading = true;
    error = null;
    try {
      const [nextRows, nextWarehouses] = await Promise.all([
        dependencies.list.execute({
          limit: 500,
          fromWarehouseId: fromWarehouseFilter ? Number(fromWarehouseFilter) : undefined,
          toWarehouseId: toWarehouseFilter ? Number(toWarehouseFilter) : undefined
        }),
        warehouses.length ? Promise.resolve(warehouses) : warehousesDependencies.listWarehouses.execute()
      ]);
      if (epoch !== listEpoch) return;
      rows = nextRows;
      warehouses = nextWarehouses.filter(row => row.active);
    } catch (cause) {
      if (epoch === listEpoch) error = toUserMessage(cause, 'No se pudieron cargar los movimientos o almacenes autorizados');
    } finally {
      if (epoch === listEpoch) loading = false;
    }
  }

  async function searchBins(side: 'source' | 'destination', query: string, warehouseId: number) {
    const isSource = side === 'source';
    const epoch = isSource ? ++sourceBinEpoch : ++destinationBinEpoch;
    const setSearching = (value: boolean) => { if (isSource) sourceBinSearching = value; else destinationBinSearching = value; };
    const setResults = (value: OperationalBinSearchResult[]) => { if (isSource) sourceBins = value; else destinationBins = value; };
    if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0 || !query.trim()) {
      setResults([]); setSearching(false); return;
    }
    setSearching(true);
    try {
      const results = await warehousesDependencies.searchOperationalBins.execute(query, warehouseId);
      if ((isSource ? sourceBinEpoch : destinationBinEpoch) === epoch) setResults(results.filter(bin => bin.warehouseId === warehouseId));
    } catch (cause) {
      if ((isSource ? sourceBinEpoch : destinationBinEpoch) === epoch) error = toUserMessage(cause, 'No se pudieron buscar las ubicaciones');
    } finally {
      if ((isSource ? sourceBinEpoch : destinationBinEpoch) === epoch) setSearching(false);
    }
  }

  async function searchItems(query: string) {
    const epoch = ++itemEpoch;
    if (query.trim().length < 2) { itemResults = []; itemSearching = false; return; }
    itemSearching = true;
    try {
      const results = await itemsDependencies.searchItems.execute(query);
      if (itemEpoch === epoch) itemResults = results.filter(item => item.active);
    } catch (cause) {
      if (itemEpoch === epoch) error = toUserMessage(cause, 'No se pudieron buscar los productos');
    } finally {
      if (itemEpoch === epoch) itemSearching = false;
    }
  }

  async function create(input: RecordInterWarehouseTransfer) {
    if (saving) return false;
    saving = true;
    error = null;
    try {
      await dependencies.create.execute(input);
      sourceBins = []; destinationBins = []; itemResults = [];
      await load();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo transferir el inventario');
      return false;
    } finally {
      saving = false;
    }
  }

  function setFromWarehouseFilter(value: string) { fromWarehouseFilter = value; void load(); }
  function setToWarehouseFilter(value: string) { toWarehouseFilter = value; void load(); }

  return {
    get rows() { return rows; }, get warehouses() { return warehouses; },
    get sourceBins() { return sourceBins; }, get destinationBins() { return destinationBins; },
    get itemResults() { return itemResults; },
    get sourceBinSearching() { return sourceBinSearching; },
    get destinationBinSearching() { return destinationBinSearching; },
    get itemSearching() { return itemSearching; },
    get loading() { return loading; }, get saving() { return saving; }, get error() { return error; },
    get fromWarehouseFilter() { return fromWarehouseFilter; }, get toWarehouseFilter() { return toWarehouseFilter; },
    setFromWarehouseFilter, setToWarehouseFilter, searchBins, searchItems, load, create
  };
}
