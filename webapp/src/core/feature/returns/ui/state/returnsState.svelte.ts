import { createReturnsDependencies } from '../../di/returns.dependencies';
import type { Return } from '../../domain/entity/Return';
import type { ReturnBinOption, ReturnWarehouseOption } from '../../domain/entity/Return';
import type { ReturnableOrder } from '../../domain/entity/ReturnableOrder';
import type { RequestedReturnLine } from '../../domain/policy/ReturnQuantityPolicy';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const d = createReturnsDependencies();

export function createReturnsState() {
  let rows = $state<Return[]>([]);
  let selected = $state<Return | null>(null);
  let warehouses = $state<ReturnWarehouseOption[]>([]);
  let bins = $state<ReturnBinOption[]>([]);
  let originals = $state<{ salesOrderId: number; salesOrderNumber: string; customerName: string | null; warehouseId: number; status: string }[]>([]);
  let returnableOrder = $state<ReturnableOrder | null>(null);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let status = $state('');
  let search = $state('');
  let originalSearch = $state('');
  let listGeneration = 0;
  let detailGeneration = 0;
  let originalGeneration = 0;
  let binGeneration = 0;
  let selectedWarehouseForBins = 0;

  async function load() {
    const generation = ++listGeneration;
    loading = true; error = null;
    try {
      const result = await d.list.execute({ status: status || undefined, search: search || undefined });
      if (generation === listGeneration) rows = result;
    } catch (cause) {
      if (generation === listGeneration) error = toUserMessage(cause, 'No se pudieron cargar las devoluciones');
    } finally {
      if (generation === listGeneration) loading = false;
    }
  }

  async function detail(id: number, includeReceipts = false) {
    const generation = ++detailGeneration;
    loading = true; error = null; selected = null; bins = [];
    try {
      const [result, warehouseOptions] = await Promise.all([d.detail.execute(id, includeReceipts), d.warehouses.execute()]);
      if (generation !== detailGeneration) return;
      selected = result;
      warehouses = warehouseOptions;
    } catch (cause) {
      if (generation === detailGeneration) error = toUserMessage(cause, 'No se pudo cargar el detalle de la devolución');
    } finally {
      if (generation === detailGeneration) loading = false;
    }
  }

  async function searchOriginals(query = originalSearch) {
    const generation = ++originalGeneration;
    originalSearch = query;
    try {
      const result = await d.originals.execute(query);
      if (generation === originalGeneration) originals = result;
    } catch (cause) {
      if (generation === originalGeneration) error = toUserMessage(cause, 'No se pudieron buscar pedidos enviados');
    }
  }

  async function loadReturnableOrder(id: number) {
    const generation = ++originalGeneration;
    loading = true; error = null; returnableOrder = null;
    try {
      const result = await d.returnableOrder.execute(id);
      if (generation === originalGeneration) returnableOrder = result;
    } catch (cause) {
      if (generation === originalGeneration) error = toUserMessage(cause, 'No se pudo calcular la cantidad disponible para devolución');
    } finally {
      if (generation === originalGeneration) loading = false;
    }
  }

  async function createReturn(lines: RequestedReturnLine[], memo: string) {
    if (!returnableOrder || saving) return false;
    saving = true; error = null;
    try {
      const result = await d.create.execute(returnableOrder.salesOrderId, { lines, memo }, returnableOrder);
      returnableOrder = null;
      await load();
      await detail(result.so_id);
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo crear la autorización de devolución');
      // The server serializes the shipped-quantity allowance. Refresh it after
      // a rejected request so a concurrent RMA cannot leave a stale allowance.
      const sourceId = returnableOrder.salesOrderId;
      try { returnableOrder = await d.returnableOrder.execute(sourceId); } catch { returnableOrder = null; }
      return false;
    } finally { saving = false; }
  }

  async function searchBins(warehouseId: number, query: string) {
    const generation = ++binGeneration;
    selectedWarehouseForBins = warehouseId;
    try {
      const result = await d.bins.execute(warehouseId, query);
      if (generation === binGeneration && selectedWarehouseForBins === warehouseId) bins = result;
    } catch (cause) {
      if (generation === binGeneration) error = toUserMessage(cause, 'No se pudieron buscar ubicaciones');
    }
  }

  async function memo(id: number, value: string) {
    if (saving) return false;
    saving = true; error = null;
    try {
      await d.saveMemo.execute(id, value);
      if (selected?.salesOrderId === id) selected = { ...selected, memo: value || null };
      return true;
    } catch (cause) { error = toUserMessage(cause, 'No se pudo guardar la nota'); return false; }
    finally { saving = false; }
  }

  async function receive(id: number, value: { itemId: number; quantity: number; warehouseId: number; binId: number; notes?: string | null; idempotencyKey: string }) {
    if (saving) return false;
    saving = true; error = null;
    try {
      await d.receive.execute(id, value);
      await detail(id);
      await load();
      return true;
    } catch (cause) {
      // A timeout may happen after the server committed the receipt. Re-read
      // the RMA before allowing a retry; the UI retains the same idempotency key.
      try { await detail(id); } catch { /* retain the original mutation error */ }
      error = toUserMessage(cause, 'No se pudo confirmar la recepción; se ha intentado reconciliar el estado del RMA');
      return false;
    } finally { saving = false; }
  }

  async function voidReturn(id: number) {
    if (saving) return false;
    saving = true; error = null;
    try { await d.voidReturn.execute(id); selected = null; await load(); return true; }
    catch (cause) { error = toUserMessage(cause, 'No se pudo anular la devolución'); return false; }
    finally { saving = false; }
  }

  return {
    get rows() { return rows; }, get selected() { return selected; },
    get warehouses() { return warehouses; }, get bins() { return bins; },
    get originals() { return originals; }, get returnableOrder() { return returnableOrder; },
    get loading() { return loading; }, get saving() { return saving; }, get error() { return error; },
    get status() { return status; }, get search() { return search; }, get originalSearch() { return originalSearch; },
    setStatus(value: string) { status = value; }, setSearch(value: string) { search = value; },
    load, detail, searchOriginals, loadReturnableOrder, createReturn, searchBins, memo, receive, voidReturn,
    clearBins() { ++binGeneration; selectedWarehouseForBins = 0; bins = []; },
    close() { ++detailGeneration; selected = null; bins = []; },
    clearReturnableOrder() { ++originalGeneration; returnableOrder = null; }
  };
}
