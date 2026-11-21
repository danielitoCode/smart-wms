import { createTransferOrdersDependencies } from '../../di/transferOrders.dependencies';
import type { CreateTransferOrder, TransferOrder, TransferOrderImportResult, TransferOrderQuery, TransferOrderWarehouse } from '../../domain/entity/TransferOrder';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
import { canAccessTransferWarehouses } from '../../domain/policy/TransferWarehouseScopePolicy';
import { TransferLifecycleNotSupportedError } from '../../domain/contract/TransferLifecycleContract';

export function createTransferOrdersState(dependencies = createTransferOrdersDependencies()) {
  let rows = $state<TransferOrder[]>([]);
  let selected = $state<TransferOrder | null>(null);
  let pickerSnapshot = $state<TransferOrder | null>(null);
  let warehouses = $state<TransferOrderWarehouse[]>([]);
  let created = $state<TransferOrderImportResult | null>(null);
  let importErrors = $state<Array<{ rowIndex: number; errorKind: string; sku?: string }>>([]);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let status = $state('');
  let sourceWarehouseId = $state<number | null>(null);
  let destinationWarehouseId = $state<number | null>(null);
  let page = $state(1);
  let pages = $state(1);
  let total = $state(0);
  let listEpoch = 0;
  let detailEpoch = 0;

  const query = (): TransferOrderQuery => ({
    status: status ? status as TransferOrderQuery['status'] : undefined,
    sourceWarehouseId: sourceWarehouseId ?? undefined,
    destinationWarehouseId: destinationWarehouseId ?? undefined,
    page,
    perPage: 50
  });

  async function load() {
    const epoch = ++listEpoch;
    detailEpoch += 1;
    loading = true;
    error = null;
    try {
      if (warehouses.length === 0) await loadWarehouses();
      const result = await dependencies.list.execute(query());
      if (epoch !== listEpoch) return;
      const allowedIds = warehouses.map(warehouse => warehouse.warehouseId);
      const scopedRows = result.orders.filter(order => canAccessTransferWarehouses({
        role: 'USER', assignedWarehouseIds: allowedIds,
        sourceWarehouseId: order.sourceWarehouseId, destinationWarehouseId: order.destinationWarehouseId
      }));
      rows = scopedRows;
      const scopeMismatch = scopedRows.length !== result.orders.length;
      total = scopeMismatch ? scopedRows.length : result.total;
      page = scopeMismatch ? 1 : result.page;
      pages = scopeMismatch ? 1 : result.pages;
      if (scopeMismatch) error = 'Se ocultaron transferencias fuera del alcance autorizado de ambos almacenes';
    } catch (cause) {
      if (epoch === listEpoch) error = toUserMessage(cause, 'No se pudieron cargar las transferencias');
    } finally {
      if (epoch === listEpoch) loading = false;
    }
  }

  async function loadWarehouses() {
    try {
      warehouses = (await dependencies.warehouses.execute()).filter(warehouse => warehouse.active);
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudieron cargar los almacenes');
    }
  }

  async function detail(id: number) {
    const epoch = ++detailEpoch;
    loading = true;
    error = null;
    selected = null;
    pickerSnapshot = null;
    try {
      if (warehouses.length === 0) await loadWarehouses();
      const result = await dependencies.detail.execute(id);
      if (epoch !== detailEpoch) return;
      if (!canAccessTransferWarehouses({ role: 'USER', assignedWarehouseIds: warehouses.map(warehouse => warehouse.warehouseId), sourceWarehouseId: result.sourceWarehouseId, destinationWarehouseId: result.destinationWarehouseId })) {
        selected = null;
        throw new Error('No tienes acceso a los almacenes de origen y destino de esta transferencia');
      }
      selected = result;
    } catch (cause) {
      if (epoch === detailEpoch) error = toUserMessage(cause, 'No se pudo cargar el detalle de la transferencia');
    } finally {
      if (epoch === detailEpoch) loading = false;
    }
  }

  async function loadPickerDetail() {
    if (!selected) return;
    const selectedId = selected.transferOrderId;
    const epoch = detailEpoch;
    loading = true;
    error = null;
    try {
      const result = await dependencies.pickerDetail.execute(selectedId);
      if (epoch === detailEpoch && selected?.transferOrderId === selectedId) pickerSnapshot = result;
    } catch (cause) {
      if (epoch === detailEpoch) error = toUserMessage(cause, 'No se pudo cargar el progreso del picker');
    } finally {
      if (epoch === detailEpoch) loading = false;
    }
  }



  async function act<T>(_action: () => Promise<T>, _successMessage: (result: T) => string = () => 'Operación completada') {
    if (saving) return false;
    error = new TransferLifecycleNotSupportedError('dispatchTransfer').message;
    return false;
  }

  async function create(_input: CreateTransferOrder) {
    if (saving) return false;
    error = new TransferLifecycleNotSupportedError('reserveTransferStock').message;
    return false;
  }

  return {
    get rows() { return rows; },
    get selected() { return selected; },
    get pickerSnapshot() { return pickerSnapshot; },
    get warehouses() { return warehouses; },
    get created() { return created; },
    get importErrors() { return importErrors; },
    get loading() { return loading; },
    get saving() { return saving; },
    get error() { return error; },
    get notice() { return notice; },
    get status() { return status; },
    get sourceWarehouseId() { return sourceWarehouseId; },
    get destinationWarehouseId() { return destinationWarehouseId; },
    get page() { return page; },
    get pages() { return pages; },
    get total() { return total; },
    get lifecycleAvailable() { return false; },
    load,
    loadWarehouses,
    detail,
    loadPickerDetail,
    create,
    setStatus(value: string) { status = value; page = 1; selected = null; pickerSnapshot = null; detailEpoch += 1; },
    setSourceWarehouse(value: number | null) { sourceWarehouseId = value; page = 1; selected = null; pickerSnapshot = null; detailEpoch += 1; },
    setDestinationWarehouse(value: number | null) { destinationWarehouseId = value; page = 1; selected = null; pickerSnapshot = null; detailEpoch += 1; },
    setPage(value: number) { page = Math.max(1, Math.min(value, pages)); },
    startPicking: (id: number) => act(() => dependencies.startPicking.execute(id), result => `Lote ${result.batchNumber} creado con ${result.tasksCreated} tarea(s)`),
    submitPickerResult: (id: number) => act(() => dependencies.submitPickerResult.execute(id), result => `Envío #${result.approvalId} creado · ${result.lineCount} línea(s)`),
    approve: (id: number, approvalId: number) => act(() => dependencies.approve.execute(id, approvalId), () => 'Aprobación completada; inventario movido al almacén destino'),
    reject: (id: number, approvalId: number, reason: string) => act(() => dependencies.reject.execute(id, approvalId, reason), () => 'Envío rechazado; el inventario permanece en origen'),
    cancel: (id: number) => act(() => dependencies.cancel.execute(id), () => 'Transferencia cancelada'),
    async remove(_id: number) {
      if (saving) return false;
      error = new TransferLifecycleNotSupportedError('cancelTransfer').message;
      return false;
    },
    shortClose: (id: number, lineId: number) => act(() => dependencies.shortClose.execute(id, lineId), () => 'Línea cerrada por faltante'),
    clearSelected() { selected = null; pickerSnapshot = null; detailEpoch += 1; },
    clearCreated() { created = null; }
  };
}
