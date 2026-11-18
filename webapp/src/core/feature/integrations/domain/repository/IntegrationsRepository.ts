import type { Connector, CredentialMetadata, SyncStatus, SyncType, ConnectionTestResult, SyncQueueResult, SyncResetResult } from '../entity/Connector';
export interface IntegrationsRepository {
  listConnectors(): Promise<Connector[]>;
  getConfigSchema(name: string): Promise<Connector>;
  getCredentials(name: string, warehouseId: number): Promise<CredentialMetadata[]>;
  saveCredentials(name: string, warehouseId: number, credentials: Record<string, string>): Promise<string[]>;
  testConnection(name: string, warehouseId: number): Promise<ConnectionTestResult>;
  getSyncStatus(name: string, warehouseId: number): Promise<SyncStatus[]>;
  resetSync(name: string, warehouseId: number, syncType?: SyncType | null): Promise<SyncResetResult>;
  executeSync(name: string, warehouseId: number, syncType: SyncType): Promise<SyncQueueResult>;
  deleteCredentials(name: string, warehouseId: number): Promise<void>;
  /** Legacy compatibility until the screen is migrated to warehouse-scoped actions. */
  test(name: string): Promise<{ ok: boolean; message: string | null }>;
}
