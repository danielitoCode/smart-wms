import { createInterWarehouseTransfersDependencies } from '../../di/interWarehouseTransfers.dependencies';
import type { InterWarehouseTransfer, RecordInterWarehouseTransfer } from '../../domain/entity/InterWarehouseTransfer';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const dependencies = createInterWarehouseTransfersDependencies();

export function createInterWarehouseTransfersState() {
  let rows = $state<InterWarehouseTransfer[]>([]);
  let loading = $state(false);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let fromWarehouseFilter = $state('');
  let toWarehouseFilter = $state('');

  async function load() {
    if (loading) return;
    loading = true;
    error = null;
    try {
      rows = await dependencies.list.execute({ limit: 500 });
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudieron cargar los movimientos');
    } finally {
      loading = false;
    }
  }

  async function create(input: RecordInterWarehouseTransfer) {
    if (saving) return false;
    saving = true;
    error = null;
    try {
      await dependencies.create.execute(input);
      await load();
      return true;
    } catch (cause) {
      error = toUserMessage(cause, 'No se pudo transferir el inventario');
      return false;
    } finally {
      saving = false;
    }
  }

  const visibleRows = () => rows.filter(row =>
    (!fromWarehouseFilter || row.sourceWarehouseId === Number(fromWarehouseFilter)) &&
    (!toWarehouseFilter || row.destinationWarehouseId === Number(toWarehouseFilter))
  );

  return {
    get rows() { return rows; },
    get visibleRows() { return visibleRows(); },
    get loading() { return loading; },
    get saving() { return saving; },
    get error() { return error; },
    get fromWarehouseFilter() { return fromWarehouseFilter; },
    get toWarehouseFilter() { return toWarehouseFilter; },
    setFromWarehouseFilter(value: string) { fromWarehouseFilter = value; },
    setToWarehouseFilter(value: string) { toWarehouseFilter = value; },
    load,
    create
  };
}
