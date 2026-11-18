export const INBOUND_RESOURCES = ['sales_orders', 'items', 'customers', 'vendors', 'purchase_orders'] as const;
export type InboundActivityResource = (typeof INBOUND_RESOURCES)[number];
export type InboundActivityStatus = 'applied' | 'superseded';
export type InboundActivityRow = {
	inboundId: number; resource: InboundActivityResource; sourceSystem: string; externalId: string;
	externalVersion: string; canonicalId: string | null; receivedAt: string | null;
	status: InboundActivityStatus; supersededAt: string | null; ingestedViaTokenId: number | null;
};
export type InboundActivityQuery = {
	resource?: InboundActivityResource; sourceSystem?: string; status?: InboundActivityStatus;
	since?: string; until?: string; page?: number; perPage?: number;
};
export type InboundActivityDetail = {
	row: InboundActivityRow; sourcePayload: unknown | null; canonicalPayload: unknown | null;
	sourcePayloadRetained: boolean;
};
