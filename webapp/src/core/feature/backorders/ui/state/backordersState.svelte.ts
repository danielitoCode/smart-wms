import { createBackordersDependencies } from '../../di/backorders.dependencies';
import type {
  Backorder, BackorderAuditEntry, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../../domain/entity/Backorder';
import { toUserMessage } from '#core/infrastructure/errors/ApiError.ts';

const dependencies = createBackordersDependencies();

export function createBackordersState() {
  let rows = $state<Backorder[]>([]);
  let detail = $state<BackorderDetail | null>(null);
  let auditEntries = $state<BackorderAuditEntry[]>([]);
  let auditPage = $state(1);
  let auditPages = $state(1);
  let auditTotal = $state(0);
  let auditLoading = $state(false);
  let auditError = $state<string | null>(null);
  let tab = $state<BackorderQueueTab>('waiting');
  let loading = $state(false);
  let detailLoading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let detailError = $state<string | null>(null);
  let listEpoch = 0;
  let detailEpoch = 0;
  let auditEpoch = 0;

  async function load(warehouseId: number | null, nextTab: BackorderQueueTab = tab): Promise<void> {
    const epoch = ++listEpoch;
    loading = true;
    detailEpoch += 1;
    auditEpoch += 1;
    detail = null;
    auditEntries = [];
    detailLoading = false;
    auditLoading = false;
    auditError = null;
    rows = [];
    error = null;
    tab = nextTab;
    try {
      const result = await dependencies.list.execute(warehouseId, tab);
      if (epoch === listEpoch) rows = result;
    } catch (cause) {
      if (epoch === listEpoch) {
        rows = [];
        error = toUserMessage(cause, 'No se pudieron cargar los pedidos pendientes');
      }
    } finally {
      if (epoch === listEpoch) loading = false;
    }
  }

  async function loadDetail(backorderId: number): Promise<void> {
    const epoch = ++detailEpoch;
    detailLoading = true;
    detailError = null;
    detail = null;
    auditEpoch += 1;
    auditEntries = [];
    auditPage = 1;
    auditPages = 1;
    auditTotal = 0;
    auditLoading = false;
    auditError = null;
    try {
      const result = await dependencies.detail.execute(backorderId);
      if (epoch === detailEpoch) detail = result;
    } catch (cause) {
      if (epoch === detailEpoch) {
        detailError = toUserMessage(cause, 'No se pudo cargar el detalle del pedido pendiente');
      }
    } finally {
      if (epoch === detailEpoch) detailLoading = false;
    }
  }

  async function loadAuditHistory(id: number, requestedPage = 1): Promise<boolean> {
    if (!detail || detail.order.salesOrderId !== id) return false;
    const epoch = ++auditEpoch;
    auditLoading = true;
    auditError = null;
    try {
      const result = await dependencies.auditHistory.execute(id, requestedPage);
      if (epoch !== auditEpoch || detail?.order.salesOrderId !== id) return false;
      auditEntries = result.entries;
      auditPage = result.page;
      auditPages = result.pages;
      auditTotal = result.total;
      return true;
    } catch (cause) {
      if (epoch === auditEpoch) auditError = toUserMessage(cause, 'No se pudo cargar el historial del backorder');
      return false;
    } finally {
      if (epoch === auditEpoch) auditLoading = false;
    }
  }

  async function cancel(id: number, reason: CancelBackorderReason, expectedWarehouseId: number): Promise<boolean> {
    if (saving) return false;
    saving = true;
    error = null;
    try {
      await dependencies.cancel.execute(id, reason, expectedWarehouseId);
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo cancelar el pedido pendiente');
      return false;
    } finally {
      saving = false;
    }
  }

  function clearError(): void {
    error = null;
    detailError = null;
  }

  return {
    get rows() { return rows; },
    get detail() { return detail; },
    get auditEntries() { return auditEntries; },
    get auditPage() { return auditPage; },
    get auditPages() { return auditPages; },
    get auditTotal() { return auditTotal; },
    get auditLoading() { return auditLoading; },
    get auditError() { return auditError; },
    get tab() { return tab; },
    get loading() { return loading; },
    get detailLoading() { return detailLoading; },
    get saving() { return saving; },
    get error() { return error; },
    get detailError() { return detailError; },
    load,
    loadDetail,
    loadAuditHistory,
    cancel,
    clearError
  };
}
