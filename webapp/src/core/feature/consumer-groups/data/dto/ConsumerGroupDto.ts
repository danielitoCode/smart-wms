export type ConsumerGroupDto = {
	consumer_group_id: string;
	name: string;
	connector_id?: string | null;
	status?: string | null;
	created_at?: string | null;
};

export type ConnectorRegistryDto = {
	connector_id: string;
	name: string;
	description?: string | null;
};

export type ConsumerGroupListResponseDto = { consumer_groups?: ConsumerGroupDto[]; groups?: ConsumerGroupDto[] };
export type ConnectorRegistryListResponseDto = { connectors?: ConnectorRegistryDto[]; registry?: ConnectorRegistryDto[] };
