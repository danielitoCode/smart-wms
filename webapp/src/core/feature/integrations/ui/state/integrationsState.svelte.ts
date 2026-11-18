import { createIntegrationsDependencies } from '../../di/integrations.dependencies';
import type { Connector, CredentialMetadata, SyncStatus, SyncType, ConnectionTestResult } from '../../domain/entity/Connector';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
type Dependencies = ReturnType<typeof createIntegrationsDependencies>;
const SYNC_TYPES: SyncType[] = ['orders', 'items', 'inventory', 'fulfillment'];
const SYNC_POLL_INTERVAL_MS = 2000;
const MAX_SYNC_POLL_ATTEMPTS = 15;

export function createIntegrationsState(dependencies: Dependencies = createIntegrationsDependencies()) {
  const deps = dependencies;
  let rows = $state<Connector[]>([]);
  let selected = $state<Connector | null>(null);
  let credentials = $state<CredentialMetadata[]>([]);
  let syncStates = $state<SyncStatus[]>([]);
  let loading = $state(false);
  let activeActions = 0;
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let testResult = $state<ConnectionTestResult | null>(null);
  let epoch = 0;
  let activeWarehouseId: number | null = null;
  let syncPollTimer: ReturnType<typeof setTimeout> | null = null;
  let syncPollAttempts = 0;
  let syncPollObservedRunning = false;

  const beginAction = () => { activeActions += 1; };
  const endAction = () => { activeActions = Math.max(0, activeActions - 1); };
  function stopSyncPolling() {
    if (syncPollTimer !== null) clearTimeout(syncPollTimer);
    syncPollTimer = null;
    syncPollAttempts = 0;
    syncPollObservedRunning = false;
  }
  function scheduleSyncPoll(name: string, warehouseId: number, requestEpoch: number) {
    if (syncPollTimer !== null || syncPollAttempts >= MAX_SYNC_POLL_ATTEMPTS) return;
    syncPollTimer = setTimeout(async () => {
      syncPollTimer = null;
      if (requestEpoch !== epoch || selected?.name !== name || activeWarehouseId !== warehouseId) return;
      syncPollAttempts += 1;
      const states = await refreshSync(name, warehouseId);
      if (requestEpoch !== epoch || selected?.name !== name || activeWarehouseId !== warehouseId) return;
      const isRunning = states?.some(item => item.status === 'running') ?? false;
      if (isRunning) syncPollObservedRunning = true;
      if (syncPollObservedRunning && !isRunning) {
        stopSyncPolling();
        return;
      }
      if (syncPollAttempts < MAX_SYNC_POLL_ATTEMPTS) scheduleSyncPoll(name, warehouseId, requestEpoch);
      else stopSyncPolling();
    }, SYNC_POLL_INTERVAL_MS);
  }

  async function load() {
    if (loading) return;
    loading = true;
    error = null;
    try { rows = await deps.list.execute(); }
    catch (e) { error = toUserMessage(e, 'No se pudieron cargar las integraciones'); }
    finally { loading = false; }
  }

  async function selectConnector(connector: Connector, warehouseId: number | null) {
    stopSyncPolling();
    selected = connector;
    activeWarehouseId = warehouseId;
    credentials = [];
    syncStates = [];
    testResult = null;
    message = null;
    error = null;
    const current = ++epoch;
    if (!warehouseId) {
      loading = false;
      error = 'Selecciona un almacén para administrar esta integración';
      return;
    }
    loading = true;
    try {
      const [keys, states] = await Promise.all([
        deps.credentials.execute(connector.name, warehouseId),
        deps.syncStatus.execute(connector.name, warehouseId)
      ]);
      if (current !== epoch) return;
      credentials = keys;
      syncStates = states;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudo cargar la configuración del conector');
    } finally {
      if (current === epoch) loading = false;
    }
  }

  async function save(name: string, warehouseId: number, values: Record<string, string>) {
    beginAction();
    error = null;
    message = null;
    const current = epoch;
    try {
      const keys = await deps.save.execute(name, warehouseId, values);
      if (current !== epoch || selected?.name !== name || activeWarehouseId !== warehouseId) return false;
      message = `Credenciales guardadas: ${keys.join(', ')}`;
      const active = selected;
      if (active) await selectConnector(active, warehouseId);
      return true;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudieron guardar las credenciales');
      return false;
    } finally { endAction(); }
  }

  async function testConnection(name: string, warehouseId: number) {
    beginAction();
    error = null;
    testResult = null;
    const current = epoch;
    try {
      const result = await deps.testConnection.execute(name, warehouseId);
      if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) testResult = result;
      return result.connected;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudo probar la conexión');
      return false;
    } finally { endAction(); }
  }

  async function executeSync(name: string, warehouseId: number, type: SyncType) {
    beginAction();
    error = null;
    message = null;
    const current = epoch;
    try {
      const queued = await deps.executeSync.execute(name, warehouseId, type);
      if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) {
        message = `Sincronización ${type} encolada (tarea ${queued.taskId})`;
        syncPollAttempts = 0;
        syncPollObservedRunning = false;
        await refreshSync(name, warehouseId);
        if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) {
          scheduleSyncPoll(name, warehouseId, current);
        }
      }
      return true;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudo iniciar la sincronización');
      return false;
    } finally { endAction(); }
  }

  async function refreshSync(name: string, warehouseId: number): Promise<SyncStatus[] | null> {
    const current = epoch;
    try {
      const states = await deps.syncStatus.execute(name, warehouseId);
      if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) {
        syncStates = states;
        return states;
      }
      return null;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudo actualizar el estado de sincronización');
      return null;
    }
  }

  async function resetSync(name: string, warehouseId: number, type?: SyncType | null) {
    beginAction();
    error = null;
    message = null;
    const current = epoch;
    try {
      const result = await deps.resetSync.execute(name, warehouseId, type);
      if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) {
        stopSyncPolling();
        message = `Estados en ejecución restablecidos: ${result.rowsReset}`;
        await refreshSync(name, warehouseId);
      }
      return true;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudo restablecer la sincronización');
      return false;
    } finally { endAction(); }
  }

  async function deleteCredentials(name: string, warehouseId: number) {
    beginAction();
    error = null;
    message = null;
    const current = epoch;
    try {
      await deps.deleteCredentials.execute(name, warehouseId);
      if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) {
        credentials = [];
        message = 'Credenciales eliminadas';
      }
      return true;
    } catch (e) {
      if (current === epoch) error = toUserMessage(e, 'No se pudieron eliminar las credenciales');
      return false;
    } finally { endAction(); }
  }

  return {
    get rows() { return rows; },
    get selected() { return selected; },
    get credentials() { return credentials; },
    get syncStates() { return syncStates; },
    get loading() { return loading; },
    get saving() { return activeActions > 0; },
    get error() { return error; },
    get message() { return message; },
    get testResult() { return testResult; },
    syncTypes: SYNC_TYPES,
    load, selectConnector, save, testConnection, executeSync, refreshSync, resetSync, deleteCredentials,
    destroy: stopSyncPolling
  };
}
