import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import { IntegrationsRemoteDataSource } from '#core/feature/integrations/data/datasource/IntegrationsRemoteDataSource';
import { ConnectorMapper } from '#core/feature/integrations/data/mapper/ConnectorMapper';
describe('Integrations Flask contracts', () => {
  it('uses the actual connector catalog and config schema envelope', async () => {
    const get = vi.fn().mockResolvedValue({ connectors: [{ name: 'erp', config_schema: { api_key: { type: 'string', required: true, label: 'API Key' } }, capabilities: ['sync_orders'] }] });
    const source = new IntegrationsRemoteDataSource({ get } as unknown as ApiClient);
    const result = await source.list();
    expect(get).toHaveBeenCalledWith('/api/admin/connectors');
    expect(ConnectorMapper.toDomain(result.connectors[0])).toMatchObject({ name: 'erp', capabilities: ['sync_orders'], configSchema: { api_key: { required: true } } });
  });
  it('sends warehouse-scoped credentials and maps only masked metadata', async () => {
    const get = vi.fn().mockResolvedValue({ connector: 'erp', warehouse_id: 4, credentials: [{ key: 'api_key', value: '****', created_at: null, updated_at: '2026-11-17' }] });
    const post = vi.fn().mockResolvedValue({ keys: ['api_key'] });
    const source = new IntegrationsRemoteDataSource({ get, post } as unknown as ApiClient);
    const saved = await source.credentials('erp', 4);
    expect(get.mock.calls[0][0]).toContain('warehouse_id=4');
    expect(ConnectorMapper.credentials(saved)).toEqual([{ key: 'api_key', configured: true, createdAt: null, updatedAt: '2026-11-17' }]);
    await source.save('erp', 4, { api_key: 'new-secret' });
    expect(post.mock.calls[0][1]).toEqual({ warehouse_id: 4, credentials: { api_key: 'new-secret' } });
  });
  it('tests connection with the required warehouse id', async () => {
    const post = vi.fn().mockResolvedValue({ connected: false, message: 'Invalid credentials' });
    const source = new IntegrationsRemoteDataSource({ post } as unknown as ApiClient);
    await source.testConnection('erp', 9);
    expect(post.mock.calls[0][1]).toEqual({ warehouse_id: 9 });
  });
  it('requests sync states and queues only supported sync types', async () => {
    const get = vi.fn().mockResolvedValue({ sync_states: [{ connector_name: 'erp', warehouse_id: 4, sync_type: 'orders', sync_status: 'running', consecutive_errors: 0 }] });
    const post = vi.fn().mockResolvedValue({ task_id: 'task-1', connector: 'erp', warehouse_id: 4, sync_type: 'orders' });
    const source = new IntegrationsRemoteDataSource({ get, post } as unknown as ApiClient);
    expect((await source.syncStatus('erp', 4)).sync_states[0].sync_status).toBe('running');
    const result = await source.executeSync('erp', 4, 'orders');
    expect(post.mock.calls[0][1]).toEqual({ warehouse_id: 4 });
    expect(result.task_id).toBe('task-1');
  });
  it('sends a reset request with explicit warehouse and optional sync type', async () => {
    const post = vi.fn().mockResolvedValue({ rows_reset: 1, connector: 'erp', warehouse_id: 4, sync_type: 'orders' });
    const source = new IntegrationsRemoteDataSource({ post } as unknown as ApiClient);
    await source.resetSync('erp', 4, 'orders');
    expect(post.mock.calls[0][1]).toEqual({ warehouse_id: 4, sync_type: 'orders' });
  });
  it('preserves 409 duplicate-run and timeout failures for presentation handling', async () => {
    const conflict = Object.assign(new Error('Sync already running'), { status: 409 });
    const timeout = Object.assign(new Error('Request timed out'), { code: 'timeout' });
    const post = vi.fn().mockRejectedValueOnce(conflict).mockRejectedValueOnce(timeout);
    const source = new IntegrationsRemoteDataSource({ post } as unknown as ApiClient);
    await expect(source.executeSync('erp', 4, 'orders')).rejects.toThrow('Sync already running');
    await expect(source.testConnection('erp', 4)).rejects.toThrow('Request timed out');
  });
  it('sends the DELETE body because Flask requires warehouse_id', async () => {
    const request = vi.fn().mockResolvedValue({ message: 'Credentials deleted' });
    const source = new IntegrationsRemoteDataSource({ request } as unknown as ApiClient);
    await source.deleteCredentials('erp', 7);
    expect(request.mock.calls[0][1]).toMatchObject({ method: 'DELETE', body: { warehouse_id: 7 } });
  });
  it('never maps or stores plaintext credential values, even if the server violates masking', () => {
    const masked = ConnectorMapper.credentials({ connector: 'erp', warehouse_id: 4, credentials: [{ key: 'token', value: '****', created_at: null, updated_at: null }] });
    const unexpectedPlaintext = ConnectorMapper.credentials({ connector: 'erp', warehouse_id: 4, credentials: [{ key: 'token', value: 'must-not-enter-domain-secret', created_at: null, updated_at: null }] });
    expect(masked).toEqual([{ key: 'token', configured: true, createdAt: null, updatedAt: null }]);
    expect(unexpectedPlaintext).toEqual([{ key: 'token', configured: false, createdAt: null, updatedAt: null }]);
    expect(JSON.stringify([...masked, ...unexpectedPlaintext])).not.toContain('must-not-enter-domain-secret');
    expect(JSON.stringify([...masked, ...unexpectedPlaintext])).not.toContain('****');
  });
});
