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
  let listGeneration = 0;
  let detailGeneration = 0;

  async function load() {
    const generation = ++listGeneration;
    loading = true;
    error = null;
    try {
      const result = await dependencies.list.execute({
        status: status || undefined,
        search: search || undefined
      });
      if (generation === listGeneration) rows = result;
    } catch (cause) {
      if (generation === listGeneration) error = toUserMessage(cause, 'No se pudieron cargar los reembolsos');
    } finally {
      if (generation === listGeneration) loading = false;
    }
  }

  async function detail(id: number, includeRelated = false) {
    const generation = ++detailGeneration;
    loading = true;
    error = null;
    selected = null;
    try {
      const result = await dependencies.detail.execute(id, includeRelated);
      if (generation === detailGeneration) selected = result;
    } catch (cause) {
      if (generation === detailGeneration) error = toUserMessage(cause, 'No se pudo cargar el detalle del reembolso');
    } finally {
      if (generation === detailGeneration) loading = false;
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
    close() { ++detailGeneration; selected = null; }
  };
}
