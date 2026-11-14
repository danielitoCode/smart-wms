import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../core/infrastructure/api/ApiClient';
import { PutawayRemoteDataSource } from '../../core/feature/putaway/data/datasource/PutawayRemoteDataSource';
import { PutawayRepositoryImpl } from '../../core/feature/putaway/data/repository/PutawayRepositoryImpl';

afterEach(() => vi.unstubAllGlobals());

describe('Putaway HTTP integration', () => {
	it('maps the pending Flask suggestion and confirms against its preselected bin ID', async () => {
		const fetchMock = vi.fn()
			.mockResolvedValueOnce(new Response(JSON.stringify({
				pending_items: [{
					inventory_id: 17,
					item_id: 4,
					sku: 'SKU-004',
					item_name: 'Test item',
					quantity: 8,
					bin_id: 2,
					bin_code: 'STAGE-02',
					lot_number: 'LOT-1',
					suggested_bin: 'PICK-04',
					suggested_bin_id: 9,
					suggested_bin_priority: 1,
					suggested_bin_barcode: 'PICK-04-BC',
					suggested_bin_zone: 'Pick Zone'
				}]
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }))
			.mockResolvedValueOnce(new Response(JSON.stringify({
				message: 'Put-away confirmed',
				transfer_id: 91,
				item: 'SKU-004',
				from_bin: 'STAGE-02',
				to_bin: 'PICK-04',
				quantity: 8
			}), { status: 200, headers: { 'Content-Type': 'application/json' } }));
		vi.stubGlobal('fetch', fetchMock);

		const datasource = new PutawayRemoteDataSource(new ApiClient('https://wms.test'));
		const repository = new PutawayRepositoryImpl(datasource);
		const [item] = await repository.listPending(1);

		expect(item.suggestedBin).toEqual({
			binId: 9,
			binCode: 'PICK-04',
			binBarcode: 'PICK-04-BC',
			zoneName: 'Pick Zone',
			priority: 1
		});

		const result = await repository.confirm({
			itemId: item.itemId,
			fromBinId: item.binId,
			toBinId: item.suggestedBin!.binId,
			quantity: item.quantity,
			lotNumber: item.lotNumber
		});

		expect(result.toBin).toBe('PICK-04');
		expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
			['https://wms.test/api/putaway/pending/1', 'GET'],
			['https://wms.test/api/putaway/confirm', 'POST']
		]);
		expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({
			item_id: 4,
			from_bin_id: 2,
			to_bin_id: 9,
			quantity: 8,
			lot_number: 'LOT-1'
		});
	});
});
