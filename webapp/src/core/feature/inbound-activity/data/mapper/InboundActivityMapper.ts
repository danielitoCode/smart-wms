import type { InboundActivityDetail, InboundActivityRow } from '../../domain/entity/InboundActivity';
import type { InboundActivityDto } from '../dto/InboundActivityDto';

export const InboundActivityMapper = {
	toDomain(dto: InboundActivityDto): InboundActivityRow {
		return {
			inboundId: dto.inbound_id,
			resource: dto.resource,
			sourceSystem: dto.source_system ?? null,
			status: dto.status ?? 'unknown',
			externalId: dto.external_id ?? null,
			createdAt: dto.created_at ?? null,
			updatedAt: dto.updated_at ?? null
		};
	},
	toDetail(dto: InboundActivityDto): InboundActivityDetail {
		return {
			row: this.toDomain(dto),
			payload: dto.payload ?? null
		};
	}
};
