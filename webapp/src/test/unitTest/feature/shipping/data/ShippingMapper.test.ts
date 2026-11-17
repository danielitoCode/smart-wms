import { describe, expect, it } from 'vitest';
import { ShippingMapper } from '../../../../../core/feature/shipping/data/mapper/ShippingMapper';

describe('ShippingMapper Flask response contracts', () => {
 it('maps order warehouse and the picked quantity returned by Flask', () => {
  const result = ShippingMapper.toDetail({
   sales_order: { so_id: 2, so_number: 'SO-2', status: 'PACKED', warehouse_id: 6 },
   lines: [{ so_line_id: 21, line_number: 1, item_id: 4, sku: 'SKU-4', item_name: 'Item 4', quantity_ordered: 5, quantity_picked: 4 }],
   total_items: 4, total_lines: 1
  });
  expect(result.salesOrder).toMatchObject({ soId: 2, warehouseId: 6 });
  expect(result.lines[0]).toMatchObject({ quantity: 4, quantityOrdered: 5, quantityPicked: 4 });
  expect(result).toMatchObject({ totalItems: 4, totalLines: 1 });
 });
 it('maps fulfillment response metadata', () => {
  expect(ShippingMapper.toFulfillResult({ message: 'Shipment fulfilled', fulfillment_id: 15, so_number: 'SO-2', tracking_number: 'T-15', carrier: 'Carrier', ship_method: 'Ground', lines_shipped: 2, total_quantity: 4 })).toMatchObject({
   fulfillmentId: 15, trackingNumber: 'T-15', carrier: 'Carrier', linesShipped: 2, totalQuantity: 4
  });
 });
});
