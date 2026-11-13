export type InboundActivityDto = {
	inbound_id: number;
	resource: string;
	source_system?: string | null;
	status?: string | null;
	external_id?: string | null;
	created_at?: string | null;
	updated_at?: string | null;
	payload?: unknown;
};

export type InboundActivityListResponseDto = {
	activity?: InboundActivityDto[];
	rows?: InboundActivityDto[];
	page?: number;
	per_page?: number;
	total?: number;
};
