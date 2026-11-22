import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '#core/infrastructure/errors/ApiError';
import { createIntegrationsState } from '#core/feature/integrations/ui/state/integrationsState.svelte';
import type { Connector, CredentialMetadata, SyncStatus } from '#core/feature/integrations/domain/entity/Connector';
import type { createIntegrationsDependencies } from '#core/feature/integrations/di/integrations.dependencies';

const deps = vi.hoisted(() => ({
  list: { execute: vi.fn() },
  credentials: { execute: vi.fn() },
  save: { execute: vi.fn() },
  testConnection: { execute: vi.fn() },
  syncStatus: { execute: vi.fn() },
  resetSync: { execute: vi.fn() },
  executeSync: { execute: vi.fn() },
  deleteCredentials: { execute: vi.fn() }
}));
const createDeps = () => deps as unknown as ReturnType<typeof createIntegrationsDependencies>;
const connector = (name: string): Connector => ({ name, capabilities: ['sync_orders'], configSchema: {} });
const credential = (key: string): CredentialMetadata => ({ key, configured: true, createdAt: null, updatedAt: null });
const status = (state: string, lastSyncedAt: string | null = null, connectorName = 'erp', warehouseId = 1): SyncStatus => ({
  connectorName, warehouseId, syncType: 'orders', status: state,
  lastSyncedAt, lastSuccessAt: lastSyncedAt, lastErrorAt: null, lastErrorMessage: null, consecutiveErrors: 0
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

describe('Integrations UI state', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    deps.list.execute.mockResolvedValue([connector('erp'), connector('crm')]);
    deps.credentials.execute.mockResolvedValue([credential('api_key')]);
    deps.save.execute.mockResolvedValue(['api_key']);
    deps.testConnection.execute.mockResolvedValue({ connected: true, message: 'Connected' });
    deps.syncStatus.execute.mockResolvedValue([]);
    deps.resetSync.execute.mockResolvedValue({ rowsReset: 1, connectorName: 'erp', warehouseId: 1, syncType: null });
    deps.executeSync.execute.mockResolvedValue({ taskId: 'task-1', connectorName: 'erp', warehouseId: 1, syncType: 'orders' });
    deps.deleteCredentials.execute.mockResolvedValue(undefined);
  });

  it('discards credential and status responses from a previous warehouse selection', async () => {
    const firstCredentials = deferred<CredentialMetadata[]>();
    const firstStatus = deferred<SyncStatus[]>();
    deps.credentials.execute.mockImplementation((name: string) => name === 'erp' ? firstCredentials.promise : Promise.resolve([credential('crm_token')]));
    deps.syncStatus.execute.mockImplementation((name: string) => name === 'erp' ? firstStatus.promise : Promise.resolve([status('idle', null, 'crm', 2)]));
    const state = createIntegrationsState(createDeps());
    const oldRequest = state.selectConnector(connector('erp'), 1);
    await state.selectConnector(connector('crm'), 2);
    firstCredentials.resolve([credential('old_warehouse_secret')]);
    firstStatus.resolve([status('running')]);
    await oldRequest;
    expect(state.selected?.name).toBe('crm');
    expect(state.credentials.map(item => item.key)).toEqual(['crm_token']);
    expect(state.syncStates).toEqual([status('idle', null, 'crm', 2)]);
    state.destroy();
  });

  it('does not let a save pending for the old warehouse clear the new selection', async () => {
    const pendingSave = deferred<string[]>();
    deps.save.execute.mockReturnValue(pendingSave.promise);
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    const saving = state.save('erp', 1, { api_key: 'secret' });
    await state.selectConnector(connector('crm'), 2);
    pendingSave.resolve(['api_key']);
    expect(await saving).toBe(false);
    expect(state.selected?.name).toBe('crm');
    expect(state.message).toBeNull();
    expect(state.saving).toBe(false);
    state.destroy();
  });

  it('surfaces invalid credentials returned by the connector test', async () => {
    deps.testConnection.execute.mockResolvedValue({ connected: false, message: 'Invalid credentials' });
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    expect(await state.testConnection('erp', 1)).toBe(false);
    expect(state.testResult).toEqual({ connected: false, message: 'Invalid credentials' });
    expect(state.error).toBeNull();
    state.destroy();
  });

  it('maps network disconnection and duplicate sync 409 into actionable UI errors', async () => {
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    deps.testConnection.execute.mockRejectedValue(new ApiError(0, 'offline', 'network'));
    await state.testConnection('erp', 1);
    expect(state.error).toContain('Error de red');
    deps.executeSync.execute.mockRejectedValue(new ApiError(409, 'Sync already running', 'conflict'));
    expect(await state.executeSync('erp', 1, 'orders')).toBe(false);
    expect(state.error).toBe('Sync already running');
    state.destroy();
  });


  it('clears warehouse-scoped credentials when the warehouse selection is removed', async () => {
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    expect(state.credentials).toHaveLength(1);
    await state.selectConnector(connector('erp'), null);
    expect(state.credentials).toEqual([]);
    expect(state.syncStates).toEqual([]);
    expect(state.error).toContain('Selecciona un almacén');
    state.destroy();
  });

  it('surfaces connection timeouts distinctly from ordinary disconnections', async () => {
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    deps.testConnection.execute.mockRejectedValue(new ApiError(0, 'Request timed out', 'timeout'));
    await state.testConnection('erp', 1);
    expect(state.error).toContain('Tiempo de espera agotado');
    state.destroy();
  });

  it('polls after enqueue until a running sync transitions to completed', async () => {
    vi.useFakeTimers();
    deps.syncStatus.execute
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([status('running')])
      .mockResolvedValueOnce([status('idle', '2026-11-18T01:00:00Z')]);
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    await state.executeSync('erp', 1, 'orders');
    expect(state.message).toContain('task-1');
    expect(deps.syncStatus.execute).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2000);
    expect(state.syncStates[0]?.status).toBe('running');
    await vi.advanceTimersByTimeAsync(2000);
    expect(state.syncStates[0]?.status).toBe('idle');
    expect(state.syncStates[0]?.lastSyncedAt).toBe('2026-11-18T01:00:00Z');
    await vi.advanceTimersByTimeAsync(5000);
    expect(deps.syncStatus.execute).toHaveBeenCalledTimes(4);
    state.destroy();
    vi.useRealTimers();
  });

  it('cancels pending polling when the warehouse changes', async () => {
    vi.useFakeTimers();
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 1);
    await state.executeSync('erp', 1, 'orders');
    await state.selectConnector(connector('erp'), 2);
    const callsAfterChange = deps.syncStatus.execute.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(deps.syncStatus.execute).toHaveBeenCalledTimes(callsAfterChange);
    state.destroy();
    vi.useRealTimers();
  });

  it('keeps warehouse id attached to credential mutations and surfaces scoped HTTP failures', async () => {
    const state = createIntegrationsState(createDeps());
    await state.selectConnector(connector('erp'), 7);
    await state.save('erp', 7, { api_key: 'secret' });
    expect(deps.save.execute).toHaveBeenCalledWith('erp', 7, { api_key: 'secret' });
    await state.deleteCredentials('erp', 7);
    expect(deps.deleteCredentials.execute).toHaveBeenCalledWith('erp', 7);
    for (const statusCode of [400, 403, 404]) {
      deps.testConnection.execute.mockRejectedValueOnce(new ApiError(statusCode, `HTTP ${statusCode}`, 'api_error'));
      expect(await state.testConnection('erp', 7)).toBe(false);
      expect(state.error).toBeTruthy();
    }
    state.destroy();
  });
});
