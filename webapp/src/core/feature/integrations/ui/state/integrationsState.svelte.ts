import { createIntegrationsDependencies } from '../../di/integrations.dependencies';
import type { Connector, CredentialMetadata, SyncStatus, SyncType, ConnectionTestResult } from '../../domain/entity/Connector';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
const deps = createIntegrationsDependencies();
const SYNC_TYPES: SyncType[] = ['orders','items','inventory','fulfillment'];
export function createIntegrationsState() {
  let rows = $state<Connector[]>([]);
  let selected = $state<Connector | null>(null);
  let credentials = $state<CredentialMetadata[]>([]);
  let syncStates = $state<SyncStatus[]>([]);
  let loading = $state(false), actionLoading = $state(false);
  let error = $state<string|null>(null), message = $state<string|null>(null);
  let testResult = $state<ConnectionTestResult|null>(null);
  let storedKeys = $state<string[]>([]);
  let epoch = 0;
  let activeWarehouseId: number | null = null;
  async function load() {
    if (loading) return;
    loading = true; error = null;
    try { rows = await deps.list.execute(); }
    catch(e) { error = toUserMessage(e, 'No se pudieron cargar las integraciones'); }
    finally { loading = false; }
  }
  async function selectConnector(connector: Connector, warehouseId: number|null) {
    selected = connector; activeWarehouseId = warehouseId; credentials = []; syncStates = []; storedKeys = []; testResult = null; message = null; error = null;
    const current = ++epoch;
    if (!warehouseId) { loading = false; error = 'Selecciona un almacén para administrar esta integración'; return; }
    loading = true;
    try {
      const [keys, states] = await Promise.all([deps.credentials.execute(connector.name, warehouseId), deps.syncStatus.execute(connector.name, warehouseId)]);
      if (current !== epoch) return;
      credentials = keys; storedKeys = keys.map(k => k.key); syncStates = states;
    } catch(e) { if (current === epoch) error = toUserMessage(e, 'No se pudo cargar la configuración del conector'); }
    finally { if (current === epoch) loading = false; }
  }
  async function save(name: string, warehouseId: number, values: Record<string,string>) {
    actionLoading = true; error = null; message = null;
    const current = epoch;
    try { const keys = await deps.save.execute(name, warehouseId, values); if (current !== epoch || selected?.name !== name || activeWarehouseId !== warehouseId) return true; message = `Credenciales guardadas: ${keys.join(', ')}`; await selectConnector(selected, warehouseId); return true; }
    catch(e) { error = toUserMessage(e, 'No se pudieron guardar las credenciales'); return false; }
    finally { actionLoading = false; }
  }
  async function testConnection(name: string, warehouseId: number) {
    actionLoading = true; error = null; testResult = null;
    const current = epoch;
    try { const result = await deps.testConnection.execute(name, warehouseId); if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) testResult = result; return result.connected; }
    catch(e) { if (current === epoch) error = toUserMessage(e, 'No se pudo probar la conexión'); return false; }
    finally { actionLoading = false; }
  }
  async function executeSync(name: string, warehouseId: number, type: SyncType) {
    actionLoading = true; error = null; message = null;
    const current = epoch;
    try { const queued = await deps.executeSync.execute(name, warehouseId, type); if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) { message = `Sincronización ${type} encolada (tarea ${queued.taskId})`; await refreshSync(name, warehouseId); setTimeout(() => { if (current === epoch) void refreshSync(name, warehouseId); }, 1000); } return true; }
    catch(e) { if (current === epoch) error = toUserMessage(e, 'No se pudo iniciar la sincronización'); return false; }
    finally { actionLoading = false; }
  }
  async function refreshSync(name: string, warehouseId: number) {
    const current = epoch;
    try { const states = await deps.syncStatus.execute(name, warehouseId); if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) syncStates = states; }
    catch(e) { if (current === epoch) error = toUserMessage(e, 'No se pudo actualizar el estado de sincronización'); }
  }
  async function resetSync(name: string, warehouseId: number, type?: SyncType|null) {
    actionLoading = true; error = null; message = null;
    const current = epoch;
    try { const result = await deps.resetSync.execute(name, warehouseId, type); if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) { message = `Estados en ejecución restablecidos: ${result.rowsReset}`; await refreshSync(name, warehouseId); } return true; }
    catch(e) { if (current === epoch) error = toUserMessage(e, 'No se pudo restablecer la sincronización'); return false; }
    finally { actionLoading = false; }
  }
  async function deleteCredentials(name: string, warehouseId: number) {
    actionLoading = true; error = null; message = null;
    const current = epoch;
    try { await deps.deleteCredentials.execute(name, warehouseId); if (current === epoch && selected?.name === name && activeWarehouseId === warehouseId) { credentials = []; storedKeys = []; message = 'Credenciales eliminadas'; } return true; }
    catch(e) { if (current === epoch) error = toUserMessage(e, 'No se pudieron eliminar las credenciales'); return false; }
    finally { actionLoading = false; }
  }
  return {
    get rows(){return rows;}, get selected(){return selected;}, get credentials(){return credentials;}, get syncStates(){return syncStates;},
    get loading(){return loading;}, get saving(){return actionLoading;}, get error(){return error;}, get message(){return message;},
    get testResult(){return testResult;}, get storedKeys(){return storedKeys;}, syncTypes: SYNC_TYPES,
    load, selectConnector, save, testConnection, executeSync, refreshSync, resetSync, deleteCredentials
  };
}
