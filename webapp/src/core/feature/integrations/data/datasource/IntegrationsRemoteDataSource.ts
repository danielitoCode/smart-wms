import type { ApiClient } from '#core/infrastructure/api/ApiClient';
import type { ConnectorsResponseDto, CredentialsResponseDto, SaveCredentialsResponseDto, TestConnectionResponseDto, SyncStatusResponseDto, SyncActionResponseDto } from '../dto/ConnectorDto';
export class IntegrationsRemoteDataSource {
  constructor(private readonly api: ApiClient) {}
  list() { return this.api.get<ConnectorsResponseDto>('/api/admin/connectors'); }
  schema(name: string) { return this.api.get<import('../dto/ConnectorDto').ConnectorDto>(`/api/admin/connectors/${encodeURIComponent(name)}/config-schema`); }
  credentials(name: string, wid: number) { return this.api.get<CredentialsResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/credentials?warehouse_id=${wid}`); }
  save(name: string, wid: number, credentials: Record<string,string>) { return this.api.post<SaveCredentialsResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/credentials`, { warehouse_id: wid, credentials }); }
  testConnection(name: string, wid: number) { return this.api.post<TestConnectionResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/test`, { warehouse_id: wid }); }
  syncStatus(name: string, wid: number) { return this.api.get<SyncStatusResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/sync-status?warehouse_id=${wid}`); }
  resetSync(name: string, wid: number, syncType?: string|null) { return this.api.post<SyncActionResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/sync-reset`, { warehouse_id: wid, sync_type: syncType ?? null }); }
  executeSync(name: string, wid: number, type: string) { return this.api.post<SyncActionResponseDto>(`/api/admin/connectors/${encodeURIComponent(name)}/sync/${encodeURIComponent(type)}`, { warehouse_id: wid }); }
  deleteCredentials(name: string, wid: number) { return this.api.request<{message:string}>(`/api/admin/connectors/${encodeURIComponent(name)}/credentials`, { method: 'DELETE', body: { warehouse_id: wid } }); }
}
