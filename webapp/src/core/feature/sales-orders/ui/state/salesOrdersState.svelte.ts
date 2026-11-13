import { createSalesOrdersDependencies } from '../../di/sales-orders.dependencies';
import type {\n  CreateSalesOrder, SalesOrder, SalesOrderPage, UpdateSalesOrder, RelatedSalesOrder,\n  PartialFulfillInput, RevertSalesOrderInput, CreateRmaInput, ReceiveReturnInput\n} from '../../domain/entity/SalesOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createSalesOrdersDependencies();

const emptyPage = (): SalesOrderPage => ({
  items: [], total: 0, page: 1, perPage: 50, pages: 1
});

function toCreateInput(input: CreateSalesOrder) {
  return {
    soNumber: input.salesOrderNumber,
    warehouseId: input.warehouseId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    shipAddress: input.shipAddress,
    shipMethod: input.shipMethod,
    shipByDate: input.shipByDate,
    memo: input.memo,
    lines: input.lines
  };
}

export function createSalesOrdersState() {
  let pageData = $state<SalesOrderPage>(emptyPage());
  let status = $state('');
  let warehouseId = $state<number | null>(null);
  let search = $state('');
  let page = $state(1);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let loadedOnce = $state(false);
  let selected = $state<SalesOrder | null>(null);
  let cancellingId = $state<number | null>(null);

  async function load(): Promise<boolean> {
    if (loading) return false;
    loading = true;
    error = null;
    try {
      pageData = await deps.repository.listPage({
        status: status || undefined,
        warehouseId: warehouseId ?? undefined,
        q: search || undefined,
        page,
        perPage: 50,
        excludePostFulfillment: true
      });
      loadedOnce = true;
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudieron cargar los pedidos de venta');
      pageData = emptyPage();
      return false;
    } finally {
      loading = false;
    }
  }

  async function runMutation(action: () => Promise<void>, fallback: string): Promise<boolean> {
    if (saving) return false;
    saving = true;
    error = null;
    try {
      await action();
      await load();
      if (selected) {
        const refreshed = await deps.getSalesOrder.execute(selected.salesOrderId);
        selected = refreshed;
      }
      return true;
    } catch (err) {
      error = toUserMessage(err, fallback);
      return false;
    } finally {
      saving = false;
    }
  }

  async function create(input: CreateSalesOrder): Promise<boolean> {
    if (saving) return false;
    saving = true;
    error = null;
    try {
      await deps.createSalesOrder.execute(toCreateInput(input));
      showSelectedNull();
      page = 1;
      await load();
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo crear el pedido');
      return false;
    } finally {
      saving = false;
    }
  }

  function showSelectedNull() { selected = null; }

  async function open(id: number): Promise<boolean> {
    error = null;
    try {
      selected = await deps.getSalesOrder.execute(id);
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo cargar el pedido');
      selected = null;
      return false;
    }
  }

  function close() { selected = null; }

  async function update(id: number, input: UpdateSalesOrder): Promise<boolean> {
    return runMutation(() => deps.updateSalesOrder.execute(id, input), 'No se pudo actualizar el pedido');
  }

  async function addLine(itemId: number, quantity: number): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.addSalesOrderLine.execute(selected!.salesOrderId, itemId, quantity),
      'No se pudo añadir la línea'
    );
  }

  async function updateLine(lineId: number, quantity: number): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.updateSalesOrderLine.execute(selected!.salesOrderId, lineId, quantity),
      'No se pudo actualizar la línea'
    );
  }

  async function deleteLine(lineId: number): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.deleteSalesOrderLine.execute(selected!.salesOrderId, lineId),
      'No se pudo eliminar la línea'
    );
  }

  async function cancel(id: number): Promise<boolean> {
    if (cancellingId != null) return false;
    cancellingId = id;
    error = null;
    try {
      await deps.cancelSalesOrder.execute(id);
      await load();
      if (selected?.salesOrderId === id) selected = await deps.getSalesOrder.execute(id);
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo cancelar el pedido');
      return false;
    } finally {
      cancellingId = null;
    }
  }

  async function adminShip(): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.adminShipSalesOrder.execute(selected!.salesOrderId),
      'No se pudo registrar el despacho'
    );
  }

  function setSearch(value: string) { search = value; page = 1; }
  function setStatus(value: string) { status = value === 'All' ? '' : value; page = 1; }
  function setPage(value: number) { page = Math.max(1, Math.min(value, pageData.pages || 1)); }
  function setWarehouseId(value: number | null) { warehouseId = value; page = 1; }

  return {
    get orders() { return pageData.items; },
    get pagination() { return pageData; },
    get page() { return page; },
    get status() { return status || 'All'; },
    get warehouseId() { return warehouseId; },
    get search() { return search; },
    get loading() { return loading; },
    get saving() { return saving; },
    get error() { return error; },
    get loadedOnce() { return loadedOnce; },
    get selected() { return selected; },
    get cancellingId() { return cancellingId; },
    setSearch, setStatus, setPage, setWarehouseId,
    load, create, open, close, update, addLine, updateLine, deleteLine, cancel, adminShip,\n    loadRelated, adminPick, partialFulfill, revertStatus, createRma, receiveReturn, voidReturn
  };
}

export function createSalesOrderDetailState(soId: number) {
  let order = $state<SalesOrder | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let cancelling = $state(false);

  async function load(): Promise<boolean> {
    if (loading) return false;
    loading = true;
    error = null;
    try {
      order = await deps.getSalesOrder.execute(soId);
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo cargar el pedido');
      order = null;
      return false;
    } finally {
      loading = false;
    }
  }

  async function cancel(): Promise<boolean> {
    if (cancelling || !order) return false;
    cancelling = true;
    error = null;
    try {
      order = await deps.cancelSalesOrder.execute(soId);
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo cancelar el pedido');
      return false;
    } finally {
      cancelling = false;
    }
  }

  return {
    get order() { return order; },
    get loading() { return loading; },
    get error() { return error; },
    get cancelling() { return cancelling; },
    load, cancel
  };
}
