import type { Connector } from '../../domain/entity/Connector';
import type { ConnectorDto } from '../dto/ConnectorDto';

export const ConnectorMapper = {
	toDomain(dto: ConnectorDto): Connector {
		return {
			name: dto.name,
			displayName: dto.display_name ?? dto.name,
			description: dto.description ?? null,
			supportsSync: Boolean(dto.supports_sync)
		};
	}
};
