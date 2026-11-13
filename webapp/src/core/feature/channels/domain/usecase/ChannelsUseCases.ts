import type { ChannelsRepository } from '../repository/ChannelsRepository';
import type { ChannelCreateInput } from '../entity/Channel';

export class ListChannelsUseCase {
	constructor(private readonly repository: ChannelsRepository) {}
	execute() { return this.repository.list(); }
}

export class CreateChannelUseCase {
	constructor(private readonly repository: ChannelsRepository) {}
	execute(input: ChannelCreateInput) {
		if (!input.name.trim()) throw new Error('El nombre del canal es obligatorio');
		return this.repository.create({ ...input, name: input.name.trim() });
	}
}

export class DeleteChannelUseCase {
	constructor(private readonly repository: ChannelsRepository) {}
	execute(channelId: string) {
		if (!channelId.trim()) throw new Error('Canal inválido');
		return this.repository.remove(channelId);
	}
}
