import type { ChannelsRepository } from '../../domain/repository/ChannelsRepository';
import type { Channel, ChannelCreateInput } from '../../domain/entity/Channel';
import { ChannelsRemoteDataSource } from '../datasource/ChannelsRemoteDataSource';
import { ChannelMapper } from '../mapper/ChannelMapper';

export class ChannelsRepositoryImpl implements ChannelsRepository {
	constructor(private readonly remote: ChannelsRemoteDataSource) {}
	async list() {
		const response = await this.remote.list();
		return (response.channels ?? []).map(ChannelMapper.toDomain);
	}
	async create(input: ChannelCreateInput) {
		const dto = await this.remote.create({ name: input.name, source_system: input.sourceSystem ?? null });
		return ChannelMapper.toDomain(dto);
	}
	async remove(channelId: string) { await this.remote.remove(channelId); }
}
