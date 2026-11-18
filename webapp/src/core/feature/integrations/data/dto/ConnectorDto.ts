export type ConnectorDto = {
	name: string;
	display_name?: string | null;
	description?: string | null;
	supports_sync?: boolean | null;
};

export type ConnectorsResponseDto = { connectors?: ConnectorDto[] };
export type TestConnectorResponseDto = { ok?: boolean; success?: boolean; message?: string | null };
