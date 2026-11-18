import { createFraudReviewDependencies } from '../../di/fraudReview.dependencies';
import type { FraudReview } from '../../domain/entity/FraudReview';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createFraudReviewDependencies();

export function createFraudReviewState() {
  let rows = $state<FraudReview[]>([]);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let listEpoch = 0;

  async function load(warehouseId: number, query = '') {
    const epoch = ++listEpoch;
    if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
      rows = [];
      error = 'Selecciona un almacén para consultar la bandeja';
      loading = false;
      return;
    }
    loading = true;
    error = null;
    try {
      const result = await dependencies.list.execute(warehouseId, query);
      if (epoch === listEpoch) rows = result;
    } catch (cause) {
      if (epoch === listEpoch) error = toUserMessage(cause, 'No se pudieron cargar los pedidos retenidos');
    } finally {
      if (epoch === listEpoch) loading = false;
    }
  }

  function clear() {
    listEpoch += 1;
    rows = [];
    loading = false;
    error = null;
  }

  async function updateMemo(id: number, memo: string, warehouseId: number) {
    if (saving) return false;
    const row = rows.find((candidate) => candidate.salesOrderId === id);
    if (!row || row.warehouseId !== warehouseId) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    saving = true;
    error = null;
    try {
      await dependencies.updateMemo.execute(id, memo);
      rows = rows.map((candidate) => candidate.salesOrderId === id ? { ...candidate, memo } : candidate);
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo guardar la observación');
      return false;
    } finally {
      saving = false;
    }
  }

  async function push(id: number, warehouseId: number) {
    if (saving) return false;
    const row = rows.find((candidate) => candidate.salesOrderId === id);
    if (!row || row.warehouseId !== warehouseId) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    saving = true;
    error = null;
    try {
      await dependencies.push.execute(id);
      await load(warehouseId);
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo liberar el pedido a preparación');
      return false;
    } finally {
      saving = false;
    }
  }

  return {
    get rows() { return rows; },
    get loading() { return loading; },
    get saving() { return saving; },
    get error() { return error; },
    load,
    clear,
    updateMemo,
    push
  };
}
