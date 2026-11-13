import type { AuditLogEntry } from '../../domain/entity/AuditLogEntry';
import type { AuditLogEntryDto } from '../dto/AuditLogDto';

export const AuditLogMapper = {
	toDomain(dto: AuditLogEntryDto): AuditLogEntry {
		return {
			logId: dto.log_id,
			actionType: dto.action_type,
			entityType: dto.entity_type,
			entityId: dto.entity_id ?? null,
			userId: dto.user_id ?? null,
			username: dto.username ?? null,
			warehouseId: dto.warehouse_id ?? null,
			deviceId: dto.device_id ?? null,
			details: dto.details ?? null,
			createdAt: dto.created_at ?? null
		};
	}
};
