import { describe, expect, it } from 'vitest';
import { InboundActivityMapper } from '../../../../../core/feature/inbound-activity/data/mapper/InboundActivityMapper';
import type { InboundActivityDto } from '../../../../../core/feature/inbound-activity/data/dto/InboundActivityDto';
const dto: InboundActivityDto = { inbound_id: 5, resource: 'purchase_orders', source_system: 'erp', external_id: 'PO-5',
	external_version: 'v2', canonical_id: 'uuid-5', received_at: '2026-01-01T00:00:00Z', status: 'superseded',
	superseded_at: '2026-01-02T00:00:00Z', ingested_via_token_id: 8, source_payload: null,
	canonical_payload: { po_number: 'PO-5' }, source_payload_retained: false };
describe('InboundActivityMapper', () => {
	it('maps Flask list and detail fields', () => {
		expect(InboundActivityMapper.toDomain(dto)).toMatchObject({ inboundId: 5, resource: 'purchase_orders',
			sourceSystem: 'erp', externalId: 'PO-5', externalVersion: 'v2', canonicalId: 'uuid-5',
			status: 'superseded', receivedAt: '2026-01-01T00:00:00Z', supersededAt: '2026-01-02T00:00:00Z', ingestedViaTokenId: 8 });
		expect(InboundActivityMapper.toDetail(dto)).toMatchObject({ sourcePayload: null,
			canonicalPayload: { po_number: 'PO-5' }, sourcePayloadRetained: false });
	});
});
