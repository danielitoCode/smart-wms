import { describe, expect, it } from 'vitest';
import { PickingMapper } from '../../../../../core/feature/picking/data/mapper/PickingMapper';

describe('PickingMapper Flask response contracts', () => {
 it('maps active batch warehouse and transfer-order discriminator', () => {
  expect(PickingMapper.toActiveBatch({ active: true, batch_id: 4, warehouse_id: 12, total_picks: 3, completed_picks: 1, total_orders: 2, created_at: '2026-11-17T10:00:00Z', kind: 'TO', to_id: 90, to_number: 'TO-90' })).toMatchObject({
   active: true, batchId: 4, warehouseId: 12, totalPicks: 3, completedPicks: 1, totalOrders: 2, kind: 'TO', transferOrderId: 90, transferOrderNumber: 'TO-90'
  });
 });
 it('treats the Flask all-tasks-complete response as no pending task', () => {
  expect(PickingMapper.toPickTask({ batch_id: 4, item_id: 0, sku: '', message: 'All tasks complete' })).toBeNull();
 });
 it('maps the next-task scanner fields', () => {
  expect(PickingMapper.toPickTask({ pick_task_id: 8, batch_id: 4, item_id: 3, sku: 'SKU-3', item_name: 'Item 3', upc: 'UPC-3', quantity_to_pick: 2, bin_id: 9, bin_code: 'A-09', status: 'PENDING', pick_sequence: 4, bin_barcode: 'BIN-9', zone: 'PICK', aisle: 'A', tote_number: 'TOTE-1', so_number: 'SO-1' })).toMatchObject({ pickTaskId: 8, quantityToPick: 2, binCode: 'A-09', status: 'PENDING' });
 });
 it('maps the actual wave-create response contract', () => {
  expect(PickingMapper.toWaveCreate({
   batch_id: 5, batch_number: 'WAVE-5', total_orders: 2, total_picks: 4, total_units: 9,
   orders: [{ so_id: 3, so_number: 'SO-3', line_count: 2 }, { so_id: 4, so_number: 'SO-4', line_count: 1 }],
   warnings: ['partial coverage warning']
  })).toMatchObject({
   batchId: 5, batchNumber: 'WAVE-5', totalOrders: 2, totalPicks: 4, totalUnits: 9,
   orders: [{ soId: 3, soNumber: 'SO-3', lineCount: 2 }], warnings: ['partial coverage warning']
  });
 });

});
