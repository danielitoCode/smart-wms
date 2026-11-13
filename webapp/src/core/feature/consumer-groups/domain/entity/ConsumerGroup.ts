export type ConnectorRegistryEntry = {
	connectorId: string;
	name: string;
	description: string | null;
};

export type ConsumerGroup = {
	consumerGroupId: string;
	name: string;
	connectorId: string | null;
	status: string;
	createdAt: string | null;
};

export type ConsumerGroupCreateInput = {
	name: string;
	connectorId?: string | null;
};
