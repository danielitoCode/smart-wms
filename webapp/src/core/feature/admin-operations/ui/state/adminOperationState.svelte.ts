import { createAdminOperationsDependencies } from '../../di/adminOperations.dependencies';
import type {
  AdminOperationKey,
  AdminOperationQuery,
  AdminOperationResult
} from '../../domain/entity/AdminOperation.ts';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createAdminOperationsDependencies();

function emptyResult(feature: AdminOperationKey): AdminOperationResult {
  switch (feature) {
    case 'backorders': return { feature, rows: [], summary: null, pagination: null };
    case 'count-approvals': return { feature, rows: [], summary: null, pagination: null };
    case 'fraud': return { feature, rows: [], summary: null, pagination: null };
    case 'inter-warehouse-transfers': return { feature, rows: [], summary: null, pagination: null };
    case 'adjustments': return { feature, rows: [], summary: null, pagination: null };
    case 'pos-activity': return { feature, rows: [], summary: null, pagination: null };
    case 'preferred-bins': return { feature, rows: [], summary: null, pagination: null };
    case 'purchase-orders': return { feature, rows: [], summary: null, pagination: null };
    case 'refunds': return { feature, rows: [], summary: null, pagination: null };
    case 'returns': return { feature, rows: [], summary: null, pagination: null };
    case 'transfer-orders': return { feature, rows: [], summary: null, pagination: null };
    case 'users': return { feature, rows: [], summary: null, pagination: null };
    case 'vendors': return { feature, rows: [], summary: null, pagination: null };
  }
}

export function createAdminOperationState(feature: AdminOperationKey) {
  let result = $state<AdminOperationResult>(emptyResult(feature));
  let loading = $state(false);
  let error = $state<string | null>(null);
  let search = $state('');
  let tab = $state<'waiting' | 'ready-to-ship'>('waiting');
  let date = $state('');
  let status = $state('');
  let page = $state(1);
  const perPage = 50;
  let requestSequence = 0;

  async function load(extra: Partial<AdminOperationQuery> = {}): Promise<boolean> {
    const requestId = ++requestSequence;
    loading = true;
    error = null;

    try {
      const nextResult = await deps.list.execute(feature, {
        search,
        tab,
        date,
        status,
        page,
        perPage,
        ...extra
      });

      if (requestId !== requestSequence) return false;
      result = nextResult;
      return true;
    } catch (cause) {
      if (requestId !== requestSequence) return false;
      error = toUserMessage(cause, 'No se pudieron cargar los datos del módulo');
      result = emptyResult(feature);
      return false;
    } finally {
      if (requestId === requestSequence) loading = false;
    }
  }

  function resetPage(): void {
    page = 1;
  }

  return {
    get feature() { return result.feature; },
    get rows() { return result.rows; },
    get summary() { return result.summary; },
    get pagination() { return result.pagination; },
    get loading() { return loading; },
    get error() { return error; },
    get search() { return search; },
    get tab() { return tab; },
    get date() { return date; },
    get status() { return status; },
    get page() { return page; },
    setSearch(value: string) { search = value; resetPage(); },
    setTab(value: 'waiting' | 'ready-to-ship') { tab = value; resetPage(); },
    setDate(value: string) { date = value; resetPage(); },
    setStatus(value: string) { status = value; resetPage(); },
    setPage(value: number) { page = Math.max(1, value); },
    resetPage,
    load
  };
}
