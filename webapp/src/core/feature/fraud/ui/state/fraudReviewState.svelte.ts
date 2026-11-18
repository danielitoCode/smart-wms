import { createFraudReviewDependencies } from '../../di/fraudReview.dependencies';
import { isFraudReviewInWarehouse, type FraudReview, type FraudReviewDetail } from '../../domain/entity/FraudReview';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createFraudReviewDependencies();

export function createFraudReviewState() {
  let rows = $state<FraudReview[]>([]);
  let selectedDetail = $state<FraudReviewDetail | null>(null);
  let loading = $state(false);
  let detailLoading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let listEpoch = 0;
  let detailEpoch = 0;
  let currentQuery = '';

  async function load(warehouseId: number, query = '') {
    const epoch = ++listEpoch;
    currentQuery = query;
    rows = [];
    selectedDetail = null;
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
    detailEpoch += 1;
    rows = [];
    selectedDetail = null;
    loading = false;
    detailLoading = false;
    error = null;
  }

  async function openDetail(id: number, warehouseId: number) {
    const row = rows.find((candidate) => candidate.salesOrderId === id);
    if (!row || !isFraudReviewInWarehouse(row, warehouseId)) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    const epoch = ++detailEpoch;
    detailLoading = true;
    selectedDetail = null;
    error = null;
    try {
      const detail = await dependencies.detail.execute(id);
      if (epoch !== detailEpoch) return false;
      if (!isFraudReviewInWarehouse(detail.order, warehouseId)) {
        error = 'El detalle recibido no coincide con el almacén seleccionado.';
        return false;
      }
      selectedDetail = detail;
      return true;
    } catch (cause) {
      if (epoch === detailEpoch) error = toUserMessage(cause, 'No se pudo cargar el detalle del pedido');
      return false;
    } finally {
      if (epoch === detailEpoch) detailLoading = false;
    }
  }

  function closeDetail() {
    detailEpoch += 1;
    selectedDetail = null;
    detailLoading = false;
  }

  async function updateMemo(id: number, memo: string, warehouseId: number) {
    if (saving) return false;
    const row = rows.find((candidate) => candidate.salesOrderId === id);
    if (!row || !isFraudReviewInWarehouse(row, warehouseId)) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    saving = true;
    error = null;
    try {
      await dependencies.updateMemo.execute(id, memo);
      rows = rows.map((candidate) => candidate.salesOrderId === id ? { ...candidate, memo } : candidate);
      if (selectedDetail?.order.salesOrderId === id) {
        selectedDetail = { ...selectedDetail, order: { ...selectedDetail.order, memo } };
      }
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
    if (!row || !isFraudReviewInWarehouse(row, warehouseId)) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    saving = true;
    error = null;
    try {
      await dependencies.push.execute(id);
      await load(warehouseId, currentQuery);
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
    get selectedDetail() { return selectedDetail; },
    get loading() { return loading; },
    get detailLoading() { return detailLoading; },
    get saving() { return saving; },
    get error() { return error; },
    load, clear, openDetail, closeDetail, updateMemo, push
  };
}
