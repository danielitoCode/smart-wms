import type { Channel, ChannelCreateInput } from '../entity/Channel';

export interface ChannelsRepository {
	list(): Promise<Channel[]>;
	create(input: ChannelCreateInput): Promise<Channel>;
	remove(channelId: string): Promise<void>;
}
