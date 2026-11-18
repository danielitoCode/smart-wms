export type InboundActivityDto = {
	inbound_id: number; resource: 'sales_orders' | 'items' | 'customers' | 'vendors' | 'purchase_orders';
	source_system: string; external_id: string; external_version: string; canonical_id: string | null;
	received_at: string | null; status: 'applied' | 'superseded'; superseded_at: string | null;
	ingested_via_token_id: number | null; source_payload?: unknown | null;
	canonical_payload?: unknown | null; source_payload_retained?: boolean;
};
export type InboundActivityListResponseDto = {
	rows: InboundActivityDto[]; page: number; per_page: number; limit: number; total: number; has_next: boolean;
};
