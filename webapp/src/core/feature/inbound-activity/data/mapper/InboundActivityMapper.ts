import { INBOUND_RESOURCES, type InboundActivityDetail, type InboundActivityRow } from '../../domain/entity/InboundActivity';
import type { InboundActivityDto } from '../dto/InboundActivityDto';

export const InboundActivityMapper = {
	toDomain(dto: InboundActivityDto): InboundActivityRow {
		if (!INBOUND_RESOURCES.includes(dto.resource)) {
			throw new Error(`Recurso inbound desconocido: ${String(dto.resource)}`);
		}
		if (dto.status !== 'applied' && dto.status !== 'superseded') {
			throw new Error(`Estado inbound desconocido: ${String(dto.status)}`);
		}
		return {
			inboundId: dto.inbound_id,
			resource: dto.resource,
			sourceSystem: dto.source_system,
			externalId: dto.external_id,
			externalVersion: dto.external_version,
			canonicalId: dto.canonical_id,
			receivedAt: dto.received_at,
			status: dto.status,
			supersededAt: dto.superseded_at,
			ingestedViaTokenId: dto.ingested_via_token_id
		};
	},
	toDetail(dto: InboundActivityDto): InboundActivityDetail {
		return {
			row: this.toDomain(dto),
			sourcePayload: dto.source_payload ?? null,
			canonicalPayload: dto.canonical_payload ?? null,
			sourcePayloadRetained: dto.source_payload_retained ?? dto.source_payload != null
		};
	}
};
