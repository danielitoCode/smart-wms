export type ChannelDto = {
	channel_id: string;
	name: string;
	status?: string | null;
	source_system?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
};

export type ChannelListResponseDto = { channels?: ChannelDto[] };
