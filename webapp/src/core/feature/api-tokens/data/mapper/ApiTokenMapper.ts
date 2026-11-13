import type { ApiToken } from '../../domain/entity/ApiToken';
import type { ApiTokenDto } from '../dto/ApiTokenDto';

export const ApiTokenMapper = {
	toDomain(dto: ApiTokenDto): ApiToken {
		return {
			tokenId: dto.token_id,
			name: dto.name,
			scopes: dto.scopes ?? [],
			eventTypes: dto.event_types ?? [],
			sourceSystem: dto.source_system ?? null,
			inboundResources: dto.inbound_resources ?? [],
			mappingOverride: Boolean(dto.mapping_override),
			rotationStatus: dto.rotation_status ?? 'none',
			createdAt: dto.created_at ?? null,
			rotatedAt: dto.rotated_at ?? null,
			expiresAt: dto.expires_at ?? null,
			revokedAt: dto.revoked_at ?? null,
			lastUsedAt: dto.last_used_at ?? null
		};
	}
};
