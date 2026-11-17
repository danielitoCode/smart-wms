import type { AuditEvent } from '../../domain/entity/AuditLogEntry';
import type { AuditLogEntryDto } from '../dto/AuditLogDto';

const SENSITIVE_KEY = /(password|passwd|secret|token|authorization|cookie|credential|api[_-]?key|private[_-]?key|email|phone|address|customer|recipient|billing|shipping)/i;

function redact(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(redact);
	if (!value || typeof value !== 'object') return value;
	const safe: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
		safe[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(entry);
	}
	return safe;
}

export const AuditLogMapper = {
	toDomain(dto: AuditLogEntryDto): AuditEvent {
		return {
			logId: dto.log_id,
			action: dto.action_type,
			resourceType: dto.entity_type,
			resourceId: dto.entity_id ?? null,
			resourceName: dto.entity_name ?? null,
			actor: dto.username ?? null,
			deviceId: dto.device_id ?? null,
			warehouseId: dto.warehouse_id ?? null,
			warehouseCode: dto.warehouse_code ?? null,
			metadata: dto.details == null ? null : redact(dto.details),
			occurredAt: dto.created_at ?? null
		};
	}
};
