import { describe, expect, it } from 'vitest';
import { ReceivingMapper } from '../../../../../core/feature/receiving/data/mapper/ReceivingMapper';

describe('ReceivingMapper', () => {
	it('maps receipt history fields without losing traceability', () => {
		const receipt = ReceivingMapper.toReceipt({
			receipt_id: 7, po_line_id: 3, line_number: 2, item_id: 11, sku: 'SKU-11',
			item_name: 'Widget', quantity_received: 5, bin_id: 4, bin_code: 'STAGE-01',
			warehouse_id: 1, received_by: 'operator', received_at: '2026-11-14T12:00:00Z',
			lot_number: 'LOT-A', serial_number: null, notes: null, external_id: 'receipt-uuid'
		});
		expect(receipt).toMatchObject({
			receiptId: 7, poLineId: 3, quantityReceived: 5, binCode: 'STAGE-01',
			lotNumber: 'LOT-A', externalId: 'receipt-uuid'
		});
	});

	it('maps unreceive bin decrements and recomputed PO status', () => {
		const result = ReceivingMapper.toUnreceiveResult({
			message: 'Receipt reversed', receipt_id: 7, po_id: 2, po_status: 'PARTIAL',
			quantity_reversed: 5, bin_decrements: [{ bin_id: 4, quantity: 3 }, { bin_id: 5, quantity: 2 }]
		});
		expect(result).toEqual({
			message: 'Receipt reversed', receiptId: 7, poId: 2, poStatus: 'PARTIAL',
			quantityReversed: 5, binDecrements: [{ binId: 4, quantity: 3 }, { binId: 5, quantity: 2 }]
		});
	});

	it('maps receiving bin fields', () => {
		expect(ReceivingMapper.toBin({
			bin_id: 4, bin_code: 'STAGE-01', bin_type: 'Staging', is_active: true
		})).toEqual({ binId: 4, binCode: 'STAGE-01', binType: 'Staging', isActive: true });
	});
});
