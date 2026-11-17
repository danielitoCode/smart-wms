import { createTransferOrdersDependencies } from '../../di/transferOrders.dependencies';
import type { CreateTransferOrder, TransferOrder, TransferOrderImportResult, TransferOrderQuery, TransferOrderWarehouse } from '../../domain/entity/TransferOrder';
import { ApiError, toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createTransferOrdersDependencies();

export function createTransferOrdersState() {
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

  const query = (): TransferOrderQuery => ({
    status: status ? status as TransferOrderQuery['status'] : undefined,
    sourceWarehouseId: sourceWarehouseId ?? undefined,
    destinationWarehouseId: destinationWarehouseId ?? undefined,
    page,
    perPage: 50
  });

  async function load() {
    loading = true;
    error = null;
    try {
      const result = await dependencies.list.execute(query());
      rows = result.orders;
      total = result.total;
      page = result.page;
      pages = result.pages;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudieron cargar las transferencias');
    } finally {
      loading = false;
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
    loading = true;
    error = null;
    pickerSnapshot = null;
    try {
      selected = await dependencies.detail.execute(id);
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo cargar el detalle de la transferencia');
    } finally {
      loading = false;
    }
  }

  async function loadPickerDetail() {
    if (!selected) return;
    loading = true;
    error = null;
    try {
      pickerSnapshot = await dependencies.pickerDetail.execute(selected.transferOrderId);
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo cargar el progreso del picker');
    } finally {
      loading = false;
    }
  }

  async function refreshSelected() {
    if (selected) {
      const id = selected.transferOrderId;
      selected = await dependencies.detail.execute(id);
      if (pickerSnapshot) pickerSnapshot = await dependencies.pickerDetail.execute(id);
    }
    await load();
  }

  async function act<T>(action: () => Promise<T>, successMessage: (result: T) => string = () => 'Operación completada') {
    saving = true;
    error = null;
    notice = null;
    try {
      const result = await action();
      notice = successMessage(result);
      await refreshSelected();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo completar la operación');
      return false;
    } finally {
      saving = false;
    }
  }

  async function create(input: CreateTransferOrder) {
    saving = true;
    error = null;
    notice = null;
    created = null;
    importErrors = [];
    try {
      created = await dependencies.create.execute(input);
      notice = `Transferencia ${created.toNumber} creada`;
      await load();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo crear la transferencia');
      if (cause instanceof ApiError && cause.details && typeof cause.details === 'object') {
        const rows = (cause.details as { rows?: unknown }).rows;
        if (Array.isArray(rows)) {
          importErrors = rows.map(value => {
            const row = value as { row_index?: number; error_kind?: string; sku?: string };
            return { rowIndex: Number(row.row_index ?? 0), errorKind: row.error_kind ?? 'validation_error', sku: row.sku };
          });
        }
      }
      return false;
    } finally {
      saving = false;
    }
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
    load,
    loadWarehouses,
    detail,
    loadPickerDetail,
    create,
    setStatus(value: string) { status = value; page = 1; },
    setSourceWarehouse(value: number | null) { sourceWarehouseId = value; page = 1; },
    setDestinationWarehouse(value: number | null) { destinationWarehouseId = value; page = 1; },
    setPage(value: number) { page = Math.max(1, Math.min(value, pages)); },
    startPicking: (id: number) => act(() => dependencies.startPicking.execute(id), result => `Lote ${result.batchNumber} creado con ${result.tasksCreated} tarea(s)`),
    submitPickerResult: (id: number) => act(() => dependencies.submitPickerResult.execute(id), result => `Envío #${result.approvalId} creado · ${result.lineCount} línea(s)`),
    approve: (id: number, approvalId: number) => act(() => dependencies.approve.execute(id, approvalId), () => 'Aprobación completada; inventario movido al almacén destino'),
    reject: (id: number, approvalId: number, reason: string) => act(() => dependencies.reject.execute(id, approvalId, reason), () => 'Envío rechazado; el inventario permanece en origen'),
    cancel: (id: number) => act(() => dependencies.cancel.execute(id), () => 'Transferencia cancelada'),
    remove(id: number) { selected = null; pickerSnapshot = null; return act(() => dependencies.remove.execute(id), () => 'Transferencia eliminada'); },
    shortClose: (id: number, lineId: number) => act(() => dependencies.shortClose.execute(id, lineId), () => 'Línea cerrada por faltante'),
    clearSelected() { selected = null; pickerSnapshot = null; },
    clearCreated() { created = null; }
  };
}
