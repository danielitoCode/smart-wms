import { createSalesOrdersDependencies } from '../../di/sales-orders.dependencies';
import type {
  CreateSalesOrder,
  AvailableSalesOrderBin,
  CreateRmaInput,
  PartialFulfillInput,
  ReceiveReturnInput,
  RelatedSalesOrder,
  RevertSalesOrderInput,
  SalesOrder,
  SalesOrderPage,
  UpdateSalesOrder,
  UpdateSalesOrderAddressInput
} from '../../domain/entity/SalesOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createSalesOrdersDependencies();

const emptyPage = (): SalesOrderPage => ({
  items: [],
  total: 0,
  page: 1,
  perPage: 50,
  pages: 1
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
  let relatedOrders = $state<RelatedSalesOrder[]>([]);
  let loadingRelated = $state(false);
  let cancellingId = $state<number | null>(null);
  let availableBinsByLine = $state<Record<number, AvailableSalesOrderBin[]>>({});
  let loadingBinsByLine = $state<Record<number, boolean>>({});
  let binsRequestSequence = 0;
  let binsRequestByLine: Record<number, number> = {};

  async function load(): Promise<boolean> {
    if (loading) return false;
    loading = true;
    error = null;
    try {
      pageData = await deps.listSalesOrders.execute({
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

  async function refreshSelected(): Promise<void> {
    if (selected) {
      selected = await deps.getSalesOrder.execute(selected.salesOrderId);
    }
  }

  async function runMutation(action: () => Promise<void>, fallback: string): Promise<boolean> {
    if (saving) return false;
    saving = true;
    error = null;
    try {
      await action();
      await load();
      await refreshSelected();
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
      selected = null;
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

  async function open(id: number): Promise<boolean> {
    error = null;
    relatedOrders = [];
    availableBinsByLine = {};
    loadingBinsByLine = {};
    binsRequestByLine = {};
    binsRequestSequence += 1;
    try {
      selected = await deps.getSalesOrder.execute(id);
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo cargar el pedido');
      selected = null;
      return false;
    }
  }

  function close(): void {
    selected = null;
    relatedOrders = [];
    availableBinsByLine = {};
    loadingBinsByLine = {};
    binsRequestByLine = {};
    binsRequestSequence += 1;
  }

  async function update(id: number, input: UpdateSalesOrder): Promise<boolean> {
    return runMutation(
      () => deps.updateSalesOrder.execute(id, input),
      'No se pudo actualizar el pedido'
    );
  }

  async function updateAddress(id: number, input: UpdateSalesOrderAddressInput): Promise<boolean> {
    return runMutation(
      () => deps.updateSalesOrderAddress.execute(id, input),
      'No se pudieron actualizar las direcciones del pedido'
    );
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
    if (cancellingId !== null) return false;
    cancellingId = id;
    error = null;
    try {
      await deps.cancelSalesOrder.execute(id);
      await load();
      if (selected?.salesOrderId === id) {
        selected = await deps.getSalesOrder.execute(id);
      }
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

  async function loadRelated(id = selected?.salesOrderId): Promise<boolean> {
    if (!id || loadingRelated) return false;
    loadingRelated = true;
    error = null;
    try {
      relatedOrders = await deps.getRelatedSalesOrders.execute(id);
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudieron cargar los pedidos relacionados');
      relatedOrders = [];
      return false;
    } finally {
      loadingRelated = false;
    }
  }

  async function loadAvailableBins(lineId: number): Promise<boolean> {
    if (!selected || !Number.isInteger(lineId) || lineId < 1) return false;

    const orderId = selected.salesOrderId;
    const requestId = ++binsRequestSequence;
    binsRequestByLine = { ...binsRequestByLine, [lineId]: requestId };
    loadingBinsByLine = { ...loadingBinsByLine, [lineId]: true };
    error = null;

    try {
      const bins = await deps.getAvailableSalesOrderBins.execute(orderId, lineId);

      if (
        selected?.salesOrderId !== orderId ||
        binsRequestByLine[lineId] !== requestId
      ) {
        return false;
      }

      availableBinsByLine = { ...availableBinsByLine, [lineId]: bins };
      return true;
    } catch (err) {
      if (
        selected?.salesOrderId === orderId &&
        binsRequestByLine[lineId] === requestId
      ) {
        error = toUserMessage(err, 'No se pudieron cargar las ubicaciones disponibles');
        availableBinsByLine = { ...availableBinsByLine, [lineId]: [] };
      }
      return false;
    } finally {
      if (binsRequestByLine[lineId] === requestId) {
        const nextLoading = { ...loadingBinsByLine };
        delete nextLoading[lineId];
        loadingBinsByLine = nextLoading;
        delete binsRequestByLine[lineId];
      }
    }
  }

  async function adminPick(
    lines: Array<{ soLineId: number; binId: number; quantity: number }>
  ): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.adminPickSalesOrder.execute(selected!.salesOrderId, lines),
      'No se pudo registrar el picking administrativo'
    );
  }

  async function partialFulfill(input: PartialFulfillInput): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.partialFulfillSalesOrder.execute(selected!.salesOrderId, input),
      'No se pudo realizar el cumplimiento parcial'
    );
  }

  async function revertStatus(input: RevertSalesOrderInput): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.revertSalesOrderStatus.execute(selected!.salesOrderId, input),
      'No se pudo revertir el estado del pedido'
    );
  }

  async function createRma(input: CreateRmaInput): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.createSalesOrderRma.execute(selected!.salesOrderId, input),
      'No se pudo crear la devolución'
    );
  }

  async function receiveReturn(input: ReceiveReturnInput): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.receiveSalesOrderReturn.execute(selected!.salesOrderId, input),
      'No se pudo registrar la recepción de la devolución'
    );
  }

  async function voidReturn(): Promise<boolean> {
    if (!selected) return false;
    return runMutation(
      () => deps.voidSalesOrderReturn.execute(selected!.salesOrderId),
      'No se pudo anular la devolución'
    );
  }

  function setSearch(value: string): void {
    search = value;
    page = 1;
  }

  function setStatus(value: string): void {
    status = value === 'All' ? '' : value;
    page = 1;
  }

  function setPage(value: number): void {
    page = Math.max(1, Math.min(value, pageData.pages || 1));
  }

  function setWarehouseId(value: number | null): void {
    warehouseId = value;
    page = 1;
  }

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
    get relatedOrders() { return relatedOrders; },
    get loadingRelated() { return loadingRelated; },
    get cancellingId() { return cancellingId; },
    get availableBinsByLine() { return availableBinsByLine; },
    get loadingBinsByLine() { return loadingBinsByLine; },
    setSearch,
    setStatus,
    setPage,
    setWarehouseId,
    load,
    create,
    open,
    close,
    update,
    updateAddress,
    addLine,
    updateLine,
    deleteLine,
    cancel,
    adminShip,
    loadRelated,
    loadAvailableBins,
    adminPick,
    partialFulfill,
    revertStatus,
    createRma,
    receiveReturn,
    voidReturn
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
    load,
    cancel
  };
}
