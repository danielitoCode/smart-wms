import type { Channel } from '../../domain/entity/Channel';
import type { ChannelDto } from '../dto/ChannelDto';

export const ChannelMapper = {
	toDomain(dto: ChannelDto): Channel {
		return {
			channelId: dto.channel_id,
			name: dto.name,
			status: dto.status ?? 'unknown',
			sourceSystem: dto.source_system ?? null,
			createdAt: dto.created_at ?? null,
			updatedAt: dto.updated_at ?? null
		};
	}
};
