import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { createSalesOrderDependencies } from '../../di/salesOrders.dependencies';
import type {
  CreateSalesOrder, SalesOrder, SalesOrderListQuery, SalesOrderPage, UpdateSalesOrder
} from '../../domain/entity/SalesOrder';

const dependencies = createSalesOrderDependencies();

const emptyPage = (): SalesOrderPage => ({
  items: [],
  total: 0,
  page: 1,
  perPage: 50,
  pages: 1
});

export function createSalesOrdersState() {
  let pageData = $state<SalesOrderPage>(emptyPage());
  let selected = $state<SalesOrder | null>(null);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let search = $state('');
  let status = $state('All');
  let page = $state(1);

  function query(): SalesOrderListQuery {
    return { search, status, page, perPage: 50, excludePostFulfillment: true };
  }

  async function load(): Promise<void> {
    loading = true;
    error = null;
    try {
      pageData = await dependencies.list.execute(query());
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudieron cargar los pedidos de venta');
    } finally {
      loading = false;
    }
  }

  async function open(id: number): Promise<void> {
    loading = true;
    error = null;
    try {
      selected = await dependencies.get.execute(id);
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo cargar el detalle del pedido');
    } finally {
      loading = false;
    }
  }

  async function create(input: CreateSalesOrder): Promise<boolean> {
    saving = true;
    error = null;
    try {
      const created = await dependencies.create.execute(input);
      selected = created;
      page = 1;
      await load();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo crear el pedido');
      return false;
    } finally {
      saving = false;
    }
  }

  async function update(id: number, input: UpdateSalesOrder): Promise<boolean> {
    saving = true;
    error = null;
    try {
      await dependencies.update.execute(id, input);
      await open(id);
      await load();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo actualizar el pedido');
      return false;
    } finally {
      saving = false;
    }
  }

  async function runMutation(action: () => Promise<void>, fallback: string): Promise<boolean> {
    if (!selected) return false;
    saving = true;
    error = null;
    const id = selected.salesOrderId;
    try {
      await action();
      await open(id);
      await load();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, fallback);
      return false;
    } finally {
      saving = false;
    }
  }

  return {
    get orders() { return pageData.items; },
    get pagination() { return pageData; },
    get selected() { return selected; },
    get loading() { return loading; },
    get saving() { return saving; },
    get error() { return error; },
    get search() { return search; },
    get status() { return status; },
    get page() { return page; },
    setSearch(value: string) { search = value; page = 1; },
    setStatus(value: string) { status = value; page = 1; },
    setPage(value: number) { page = value; },
    close() { selected = null; },
    load,
    open,
    create,
    update,
    cancel: (id: number) => runMutation(() => dependencies.cancel.execute(id), 'No se pudo cancelar el pedido'),
    addLine: (itemId: number, quantity: number) => runMutation(
      () => dependencies.addLine.execute(selected!.salesOrderId, itemId, quantity),
      'No se pudo añadir la línea'
    ),
    updateLine: (lineId: number, quantity: number) => runMutation(
      () => dependencies.updateLine.execute(selected!.salesOrderId, lineId, quantity),
      'No se pudo actualizar la línea'
    ),
    deleteLine: (lineId: number) => runMutation(
      () => dependencies.deleteLine.execute(selected!.salesOrderId, lineId),
      'No se pudo eliminar la línea'
    ),
    adminShip: () => runMutation(
      () => dependencies.adminShip.execute(selected!.salesOrderId),
      'No se pudo registrar el despacho'
    )
  };
}
