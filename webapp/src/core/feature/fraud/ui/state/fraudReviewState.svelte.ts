import { createFraudReviewDependencies } from '../../di/fraudReview.dependencies';
import {
  isFraudReviewInWarehouse,
  type FraudAuditEntry,
  type FraudReview,
  type FraudReviewDetail
} from '../../domain/entity/FraudReview';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createFraudReviewDependencies();

export function createFraudReviewState() {
  let rows = $state<FraudReview[]>([]);
  let selectedDetail = $state<FraudReviewDetail | null>(null);
  let auditEntries = $state<FraudAuditEntry[]>([]);
  let page = $state(1);
  let pages = $state(1);
  let total = $state(0);
  let auditPage = $state(1);
  let auditPages = $state(1);
  let auditTotal = $state(0);
  let loading = $state(false);
  let detailLoading = $state(false);
  let auditLoading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let listEpoch = 0;
  let detailEpoch = 0;
  let auditEpoch = 0;
  let currentQuery = '';

  async function load(warehouseId: number, query = currentQuery, requestedPage = 1) {
    const epoch = ++listEpoch;
    currentQuery = query;
    page = requestedPage;
    rows = [];
    detailEpoch += 1;
    auditEpoch += 1;
    detailLoading = false;
    auditLoading = false;
    selectedDetail = null;
    auditEntries = [];
    if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
      rows = [];
      error = 'Selecciona un almacén para consultar la bandeja';
      loading = false;
      return;
    }
    loading = true;
    error = null;
    try {
      const result = await dependencies.list.execute(warehouseId, query, requestedPage);
      if (epoch === listEpoch) {
        rows = result.items;
        page = result.page;
        pages = result.pages;
        total = result.total;
      }
    } catch (cause) {
      if (epoch === listEpoch) error = toUserMessage(cause, 'No se pudieron cargar los pedidos retenidos');
    } finally {
      if (epoch === listEpoch) loading = false;
    }
  }

  function clear() {
    listEpoch += 1;
    detailEpoch += 1;
    auditEpoch += 1;
    rows = [];
    selectedDetail = null;
    auditEntries = [];
    page = 1;
    pages = 1;
    total = 0;
    auditPage = 1;
    auditPages = 1;
    auditTotal = 0;
    loading = false;
    detailLoading = false;
    auditLoading = false;
    error = null;
  }

  async function openDetail(id: number, warehouseId: number) {
    const row = rows.find((candidate) => candidate.salesOrderId === id);
    if (!row || !isFraudReviewInWarehouse(row, warehouseId)) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    const epoch = ++detailEpoch;
    auditEpoch += 1;
    auditEntries = [];
    auditPage = 1;
    auditPages = 1;
    auditTotal = 0;
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
      void loadAuditHistory(id, warehouseId, 1);
      return true;
    } catch (cause) {
      if (epoch === detailEpoch) error = toUserMessage(cause, 'No se pudo cargar el detalle del pedido');
      return false;
    } finally {
      if (epoch === detailEpoch) detailLoading = false;
    }
  }

  async function loadAuditHistory(id: number, warehouseId: number, requestedPage = 1) {
    if (!selectedDetail || selectedDetail.order.salesOrderId !== id ||
        !isFraudReviewInWarehouse(selectedDetail.order, warehouseId)) return false;
    const epoch = ++auditEpoch;
    auditLoading = true;
    try {
      const result = await dependencies.auditHistory.execute(id, requestedPage);
      if (epoch !== auditEpoch || selectedDetail?.order.salesOrderId !== id) return false;
      auditEntries = result.entries;
      auditPage = result.page;
      auditPages = result.pages;
      auditTotal = result.total;
      return true;
    } catch (cause) {
      if (epoch === auditEpoch) error = toUserMessage(cause, 'No se pudo cargar el historial de auditoría');
      return false;
    } finally {
      if (epoch === auditEpoch) auditLoading = false;
    }
  }

  function closeDetail() {
    detailEpoch += 1;
    auditEpoch += 1;
    selectedDetail = null;
    auditEntries = [];
    detailLoading = false;
    auditLoading = false;
  }

  async function updateMemo(id: number, memo: string, warehouseId: number) {
    if (saving) return false;
    const row = rows.find((candidate) => candidate.salesOrderId === id);
    if (!row || !isFraudReviewInWarehouse(row, warehouseId)) {
      error = 'El pedido ya no pertenece al almacén seleccionado. Actualiza la bandeja.';
      return false;
    }
    const expectedMemo = row.memo;
    saving = true;
    error = null;
    try {
      await dependencies.updateMemo.execute(id, memo, expectedMemo);
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
      await load(warehouseId, currentQuery, page);
      if (rows.length === 0 && page > 1) await load(warehouseId, currentQuery, page - 1);
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
    get auditEntries() { return auditEntries; },
    get page() { return page; },
    get pages() { return pages; },
    get total() { return total; },
    get auditPage() { return auditPage; },
    get auditPages() { return auditPages; },
    get auditTotal() { return auditTotal; },
    get loading() { return loading; },
    get detailLoading() { return detailLoading; },
    get auditLoading() { return auditLoading; },
    get saving() { return saving; },
    get error() { return error; },
    load, clear, openDetail, loadAuditHistory, closeDetail, updateMemo, push
  };
}
