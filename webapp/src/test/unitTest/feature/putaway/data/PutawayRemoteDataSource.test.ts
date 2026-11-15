import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../../../../core/infrastructure/api/ApiClient';
import { PutawayRemoteDataSource } from '../../../../../core/feature/putaway/data/datasource/PutawayRemoteDataSource';

describe('PutawayRemoteDataSource', () => {
	const api = { get: vi.fn(), post: vi.fn() } as unknown as ApiClient;
	it('calls the staging summary endpoint', async () => {
		await new PutawayRemoteDataSource(api).getStagingSummary(5);
		expect(api.get).toHaveBeenCalledWith('/api/putaway/staging-summary/5');
	});
	it('confirms a putaway using scanned barcodes', async () => {
		await new PutawayRemoteDataSource(api).confirm({
			itemId: 8, fromBinBarcode: 'STAGE-08', toBinBarcode: 'PICK-08', quantity: 3, lotNumber: 'LOT'
		});
		expect(api.post).toHaveBeenCalledWith('/api/putaway/confirm', {
			item_id: 8, from_bin_barcode: 'STAGE-08', to_bin_barcode: 'PICK-08', quantity: 3, lot_number: 'LOT'
		});
	});
	it('updates preferred bin through the existing endpoint', async () => {
		await new PutawayRemoteDataSource(api).updatePreferred(8, 4);
		expect(api.post).toHaveBeenCalledWith('/api/putaway/update-preferred', { item_id: 8, bin_id: 4, set_as_primary: true });
	});
});
