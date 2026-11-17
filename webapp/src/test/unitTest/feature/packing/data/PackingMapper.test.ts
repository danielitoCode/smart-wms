import { describe, expect, it } from 'vitest';
import { PackingMapper } from '../../../../../core/feature/packing/data/mapper/PackingMapper';

describe('PackingMapper Flask response contracts', () => {
 it('maps order warehouse, barcode, packed quantities and verification flags', () => {
  const result = PackingMapper.toDetail({
   sales_order: { so_id: 3, so_number: 'SO-3', so_barcode: 'BAR-3', status: 'PICKED', warehouse_id: 7, ship_method: 'Ground' },
   lines: [{ so_line_id: 31, line_number: 1, item_id: 9, sku: 'SKU-9', item_name: 'Item 9', upc: 'UPC-9', weight_lbs: 1.5, quantity_ordered: 4, quantity_picked: 3, quantity_packed: 2, pack_verified: false }],
   calculated_weight_lbs: 4.5, total_items: 3, items_verified: 0
  });
  expect(result.salesOrder).toMatchObject({ soId: 3, warehouseId: 7, soBarcode: 'BAR-3' });
  expect(result.lines[0]).toMatchObject({ soLineId: 31, upc: 'UPC-9', quantityPicked: 3, quantityPacked: 2, packVerified: false });
  expect(result).toMatchObject({ calculatedWeightLbs: 4.5, totalItems: 3, itemsVerified: 0 });
 });
});
