export type InboundActivityRow = {
	inboundId: number;
	resource: string;
	sourceSystem: string | null;
	status: string;
	externalId: string | null;
	createdAt: string | null;
	updatedAt: string | null;
};

export type InboundActivityQuery = {
	resource?: string;
	sourceSystem?: string;
	status?: string;
	page?: number;
	perPage?: number;
};

export type InboundActivityDetail = {
	row: InboundActivityRow;
	payload: unknown;
};
