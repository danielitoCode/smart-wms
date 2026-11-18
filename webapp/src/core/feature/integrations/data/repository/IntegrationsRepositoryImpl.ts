import type { IntegrationsRepository } from '../../domain/repository/IntegrationsRepository';
import type { Connector, ConnectionTestResult, SyncType, SyncQueueResult, SyncResetResult } from '../../domain/entity/Connector';
import { IntegrationsRemoteDataSource } from '../datasource/IntegrationsRemoteDataSource';
import { ConnectorMapper as M } from '../mapper/ConnectorMapper';
export class IntegrationsRepositoryImpl implements IntegrationsRepository {
  constructor(private readonly remote: IntegrationsRemoteDataSource) {}
  async listConnectors(): Promise<Connector[]> { const r = await this.remote.list(); return (r.connectors ?? []).map(M.toDomain); }
  async getConfigSchema(name: string): Promise<Connector> { return M.toDomain(await this.remote.schema(name)); }
  async getCredentials(name: string, wid: number) { return M.credentials(await this.remote.credentials(name, wid)); }
  async saveCredentials(name: string, wid: number, values: Record<string,string>) { return (await this.remote.save(name, wid, values)).keys ?? []; }
  async testConnection(name: string, wid: number): Promise<ConnectionTestResult> { const r = await this.remote.testConnection(name, wid); return { connected: r.connected, message: r.message }; }
  async getSyncStatus(name: string, wid: number) { const r = await this.remote.syncStatus(name, wid); return (r.sync_states ?? []).map(M.syncStatus); }
  async resetSync(name: string, wid: number, type?: SyncType|null): Promise<SyncResetResult> { const r = await this.remote.resetSync(name, wid, type); return { rowsReset: r.rows_reset ?? 0, connectorName: r.connector, warehouseId: r.warehouse_id, syncType: (r.sync_type as SyncType|null) ?? null }; }
  async executeSync(name: string, wid: number, type: SyncType): Promise<SyncQueueResult> { const r = await this.remote.executeSync(name, wid, type); if (!r.task_id) throw new Error('El servidor no devolvió el identificador de la tarea'); return { taskId: r.task_id, connectorName: r.connector, warehouseId: r.warehouse_id, syncType: type }; }
  async deleteCredentials(name: string, wid: number) { await this.remote.deleteCredentials(name, wid); }
}
