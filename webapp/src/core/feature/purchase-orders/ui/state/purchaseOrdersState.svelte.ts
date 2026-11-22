import { createPurchaseOrdersDependencies } from '../../di/purchaseOrders.dependencies';
import type {
  AddPurchaseOrderLine, CreatePurchaseOrder, ListPurchaseOrdersParams, PurchaseOrder,
  PurchaseOrderPage, PurchaseOrderReceipt, UpdatePurchaseOrder
} from '../../domain/entity/PurchaseOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createPurchaseOrdersDependencies();

export function createPurchaseOrdersState() {
  let page = $state<PurchaseOrderPage>({ items: [], total: 0, page: 1, perPage: 50, pages: 1 });
  let selected = $state<PurchaseOrder | null>(null);
  let receipts = $state<PurchaseOrderReceipt[]>([]);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let receiptsError = $state<string | null>(null);
  let filters = $state<ListPurchaseOrdersParams>({ page: 1, perPage: 50, status: '', includeArchived: false });
  let listRequestId = 0;

  async function load(warehouseId: number | null) {
    const requestId = ++listRequestId;
    loading = true; error = null;
    try {
      const result = await dependencies.list.execute({ ...filters, warehouseId });
      if (requestId !== listRequestId) return;
      page = result;
    } catch (cause) {
      if (requestId !== listRequestId) return;
      error = toUserMessage(cause, 'No se pudieron cargar las órdenes de compra');
    } finally {
      if (requestId === listRequestId) loading = false;
    }
  }

  async function detail(id: number) {
    loading = true; error = null; receipts = []; receiptsError = null;
    try {
      selected = await dependencies.detail.execute(id);
      try { receipts = await dependencies.receipts.execute(id); }
      catch (cause) { receiptsError = toUserMessage(cause, 'No se pudo cargar el historial de recepciones'); }
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo cargar la orden de compra');
    } finally { loading = false; }
  }

  async function perform(action: () => Promise<unknown>, fallback: string): Promise<boolean> {
    saving = true; error = null;
    try { await action(); return true; }
    catch (cause) { error = toUserMessage(cause, fallback); return false; }
    finally { saving = false; }
  }

  async function create(input: CreatePurchaseOrder) {
    return perform(async () => { await dependencies.create.execute(input); }, 'No se pudo crear la orden');
  }
  async function update(id: number, input: UpdatePurchaseOrder) {
    return perform(() => dependencies.update.execute(id, input), 'No se pudo actualizar la orden');
  }
  async function addLine(id: number, input: AddPurchaseOrderLine) {
    return perform(() => dependencies.addLine.execute(id, input), 'No se pudo añadir la línea');
  }
  async function updateLine(id: number, lineId: number, quantityOrdered: number) {
    return perform(() => dependencies.updateLine.execute(id, lineId, { quantityOrdered }), 'No se pudo actualizar la cantidad');
  }
  async function deleteLine(id: number, lineId: number) {
    return perform(() => dependencies.deleteLine.execute(id, lineId), 'No se pudo eliminar la línea');
  }
  async function lifecycle(id: number, action: 'close' | 'reopen') {
    return perform(
      () => action === 'close' ? dependencies.close.execute(id) : dependencies.reopen.execute(id),
      'No se pudo cambiar el estado de la orden'
    );
  }

  function setFilter<K extends keyof ListPurchaseOrdersParams>(key: K, value: ListPurchaseOrdersParams[K]) {
    filters = { ...filters, [key]: value, page: 1 };
  }
  function setPage(nextPage: number) { filters = { ...filters, page: nextPage }; }
  function clearSelected() { selected = null; receipts = []; receiptsError = null; }

  return {
    get rows() { return page.items; }, get pagination() { return page; },
    get selected() { return selected; }, get receipts() { return receipts; },
    get loading() { return loading; }, get saving() { return saving; },
    get error() { return error; }, get receiptsError() { return receiptsError; },
    get filters() { return filters; }, setFilter, setPage, load, detail, create,
    update, addLine, updateLine, deleteLine, lifecycle, clearSelected
  };
}
