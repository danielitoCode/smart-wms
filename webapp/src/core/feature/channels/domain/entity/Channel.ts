export type Channel = {
	channelId: string;
	name: string;
	status: string;
	sourceSystem: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type ChannelCreateInput = {
	name: string;
	sourceSystem?: string | null;
};
