import { createRefundsDependencies } from '../../di/refunds.dependencies';
import type { Refund } from '../../domain/entity/Refund';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createRefundsDependencies();

export function createRefundsState() {
  let rows = $state<Refund[]>([]);
  let selected = $state<Refund | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let status = $state('');
  let search = $state('');

  async function load() {
    loading = true;
    error = null;
    try {
      rows = await dependencies.list.execute({
        status: status || undefined,
        search: search || undefined
      });
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudieron cargar los reembolsos');
    } finally {
      loading = false;
    }
  }

  async function detail(id: number) {
    loading = true;
    error = null;
    selected = null;
    try {
      selected = await dependencies.detail.execute(id);
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo cargar el detalle del reembolso');
    } finally {
      loading = false;
    }
  }

  return {
    get rows() { return rows; },
    get selected() { return selected; },
    get loading() { return loading; },
    get error() { return error; },
    get status() { return status; },
    get search() { return search; },
    setStatus(value: string) { status = value; },
    setSearch(value: string) { search = value; },
    load,
    detail,
    close() { selected = null; }
  };
}
