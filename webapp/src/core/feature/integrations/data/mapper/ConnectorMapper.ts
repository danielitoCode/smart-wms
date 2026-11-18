import type { Connector, CredentialMetadata, SyncStatus, SyncType } from '../../domain/entity/Connector';
import type { ConnectorDto, CredentialsResponseDto, SyncStatusDto } from '../dto/ConnectorDto';
export const ConnectorMapper = {
  toDomain(dto: ConnectorDto): Connector { return { name: dto.name, configSchema: dto.config_schema ?? {}, capabilities: dto.capabilities ?? [] }; },
  credentials(dto: CredentialsResponseDto): CredentialMetadata[] { return (dto.credentials ?? []).map(c => ({ key: c.key, configured: c.value === '****', createdAt: c.created_at ?? null, updatedAt: c.updated_at ?? null })); },
  syncStatus(dto: SyncStatusDto): SyncStatus { return { connectorName: dto.connector_name, warehouseId: dto.warehouse_id, syncType: dto.sync_type as SyncType, status: dto.sync_status, lastSyncedAt: dto.last_synced_at ?? null, lastSuccessAt: dto.last_success_at ?? null, lastErrorAt: dto.last_error_at ?? null, lastErrorMessage: dto.last_error_message ?? null, consecutiveErrors: dto.consecutive_errors ?? 0 }; }
};
