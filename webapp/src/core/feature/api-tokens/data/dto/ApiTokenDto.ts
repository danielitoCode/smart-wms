export type ApiTokenDto = {
	token_id: number;
	name: string;
	scopes?: string[] | null;
	event_types?: string[] | null;
	source_system?: string | null;
	inbound_resources?: string[] | null;
	mapping_override?: boolean | null;
	rotation_status?: string | null;
	created_at?: string | null;
	rotated_at?: string | null;
	expires_at?: string | null;
	revoked_at?: string | null;
	last_used_at?: string | null;
	plaintext?: string | null;
	token?: string | null;
};

export type ApiTokenListResponseDto = {
	tokens?: ApiTokenDto[];
};

export type ScopeCatalogDto = {
	scopes?: string[];
	event_types?: string[];
};
