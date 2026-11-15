import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { ReceivingRemoteDataSource } from '../../../../../core/feature/receiving/data/datasource/ReceivingRemoteDataSource';

describe('ReceivingRemoteDataSource', () => {
	const api = { get: vi.fn(), post: vi.fn() } as unknown as ApiClient;

	it('uses the receiving barcode lookup contract', async () => {
		await new ReceivingRemoteDataSource(api).lookupByBarcode('PO 1/#');
		expect(api.get).toHaveBeenCalledWith('/api/receiving/po/PO%201%2F%23');
	});

	it('sends all supported receipt line fields', async () => {
		await new ReceivingRemoteDataSource(api).receive(9, [{
			itemId: 3, quantity: 4, binId: 7, lotNumber: 'LOT', serialNumber: 'SER', notes: 'checked'
		}]);
		expect(api.post).toHaveBeenCalledWith('/api/receiving/receive', {
			po_id: 9,
			items: [{ item_id: 3, quantity: 4, bin_id: 7, lot_number: 'LOT', serial_number: 'SER', notes: 'checked' }]
		});
	});

	it('uses the receiving session cancellation contract', async () => {
		await new ReceivingRemoteDataSource(api).cancelReceipts(9, [12, 13]);
		expect(api.post).toHaveBeenCalledWith('/api/receiving/cancel', {
			po_id: 9,
			receipt_ids: [12, 13]
		});
	});

	it('uses existing PO receipt history and unreceive endpoints', async () => {
		await new ReceivingRemoteDataSource(api).listReceipts(9);
		await new ReceivingRemoteDataSource(api).unreceiveReceipt(12, 'double scan');
		expect(api.get).toHaveBeenCalledWith('/api/admin/purchase-orders/9/receipts');
		expect(api.post).toHaveBeenCalledWith('/api/admin/receipts/12/unreceive', { reason: 'double scan' });
	});

	it('loads bins using the warehouse-scoped admin endpoint', async () => {
		await new ReceivingRemoteDataSource(api).listBins(5);
		expect(api.get).toHaveBeenCalledWith('/api/admin/bins?warehouse_id=5&per_page=500');
	});
});
