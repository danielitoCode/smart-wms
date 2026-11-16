import { createBackordersDependencies } from '../../di/backorders.dependencies';
import type {
  Backorder, BackorderDetail, BackorderQueueTab, CancelBackorderReason
} from '../../domain/entity/Backorder';
import { toUserMessage } from '#core/infrastructure/errors/ApiError.ts';

const dependencies = createBackordersDependencies();

export function createBackordersState() {
  let rows = $state<Backorder[]>([]);
  let detail = $state<BackorderDetail | null>(null);
  let tab = $state<BackorderQueueTab>('waiting');
  let loading = $state(false);
  let detailLoading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let detailError = $state<string | null>(null);
  let listEpoch = 0;
  let detailEpoch = 0;

  async function load(warehouseId: number | null, nextTab: BackorderQueueTab = tab): Promise<void> {
    const epoch = ++listEpoch;
    loading = true;
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

  async function cancel(id: number, reason: CancelBackorderReason): Promise<boolean> {
    saving = true;
    error = null;
    try {
      await dependencies.cancel.execute(id, reason);
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
    get tab() { return tab; },
    get loading() { return loading; },
    get detailLoading() { return detailLoading; },
    get saving() { return saving; },
    get error() { return error; },
    get detailError() { return detailError; },
    load,
    loadDetail,
    cancel,
    clearError
  };
}
