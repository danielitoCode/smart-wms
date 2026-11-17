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
  SalesOrderSourceSystem,
  UpdateSalesOrder,
  UpdateSalesOrderAddressInput,
  UpdateSalesOrderAllocationResult,
  AdminShipShortfallLine,
  SalesOrderShortPick
} from '../../domain/entity/SalesOrder';
import { ApiError, toUserMessage } from '../../../../infrastructure/errors/ApiError';

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
    soBarcode: input.soBarcode,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    customerAddress: input.customerAddress,
    orderOrigin: input.orderOrigin,
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
  let sourceSystems = $state<SalesOrderSourceSystem[]>([]);
  let shortPicks = $state<SalesOrderShortPick[]>([]);
  let loadingShortPicks = $state(false);
  let loadedShortPicks = $state(false);
  let loadingSourceSystems = $state(false);
  let loadingRelated = $state(false);
  let adminShipShortfall = $state<AdminShipShortfallLine[] | null>(null);
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

  async function updateAllocation(lineId: number, delta: number): Promise<UpdateSalesOrderAllocationResult | null> {
    if (!selected || saving) return null;
    saving = true;
    error = null;
    try {
      const result = await deps.updateSalesOrderAllocation.execute(
        selected.salesOrderId,
        lineId,
        { delta }
      );
      await load();
      await refreshSelected();
      return result;
    } catch (err) {
      error = toUserMessage(err, 'No se pudo ajustar la asignación de inventario');
      return null;
    } finally {
      saving = false;
    }
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

  async function adminShip(acknowledgeShortfall = false): Promise<boolean> {
    if (!selected || saving) return false;
    saving = true;
    error = null;
    adminShipShortfall = null;
    try {
      await deps.adminShipSalesOrder.execute(selected.salesOrderId, acknowledgeShortfall);
      await load();
      await refreshSelected();
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.details && typeof err.details === 'object') {
        const details = err.details as { kind?: unknown; lines?: unknown };
        if (details.kind === 'silent_shortfall') {
          adminShipShortfall = Array.isArray(details.lines)
            ? details.lines as AdminShipShortfallLine[]
            : [];
          error = 'El pedido tiene líneas con faltantes sin registrar. Revisa los SKU y confirma si deseas despachar solo las cantidades recogidas.';
          return false;
        }
      }
      error = toUserMessage(err, 'No se pudo registrar el despacho');
      return false;
    } finally {
      saving = false;
    }
  }

  async function loadSourceSystems(): Promise<boolean> {
    if (loadingSourceSystems) return false;
    loadingSourceSystems = true;
    try {
      sourceSystems = await deps.listSalesOrderSourceSystems.execute();
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudieron cargar los sistemas de origen');
      sourceSystems = [];
      return false;
    } finally {
      loadingSourceSystems = false;
    }
  }

  async function loadShortPicks(days = 30, selectedWarehouseId = warehouseId ?? undefined): Promise<boolean> {
    if (loadingShortPicks) return false;
    loadingShortPicks = true;
    error = null;
    try {
      shortPicks = await deps.listSalesOrderShortPicks.execute(days, selectedWarehouseId);
      loadedShortPicks = true;
      return true;
    } catch (err) {
      error = toUserMessage(err, 'No se pudieron cargar los faltantes recientes');
      shortPicks = [];
      return false;
    } finally {
      loadingShortPicks = false;
    }
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
    get sourceSystems() { return sourceSystems; },
    get shortPicks() { return shortPicks; },
    get loadingShortPicks() { return loadingShortPicks; },
    get loadedShortPicks() { return loadedShortPicks; },
    get loadingSourceSystems() { return loadingSourceSystems; },
    get loadingRelated() { return loadingRelated; },
    get adminShipShortfall() { return adminShipShortfall; },
    get cancellingId() { return cancellingId; },
    get availableBinsByLine() { return availableBinsByLine; },
    get loadingBinsByLine() { return loadingBinsByLine; },
    setSearch,
    setStatus,
    setPage,
    setWarehouseId,
    load,
    loadSourceSystems,
    loadShortPicks,
    create,
    open,
    close,
    update,
    updateAddress,
    updateAllocation,
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
