import type { ReceiptHistoryEntry } from '../../domain/entity/ReceiptHistory';

export type ReceiptHistoryEntryDto = {
  receipt_id: number;
  po_line_id: number | null;
  line_number: number | null;
  item_id: number;
  sku: string;
  item_name: string;
  quantity_received: number;
  bin_id: number;
  bin_code: string;
  warehouse_id: number;
  received_by: string;
  received_at: string | null;
  lot_number: string | null;
  serial_number: string | null;
  notes: string | null;
};

export type ReceiptHistoryDto = { po_id: number; receipts: ReceiptHistoryEntryDto[] };
export type UnreceiveResponseDto = {
  message: string;
  receipt_id: number;
  po_id: number;
  po_status: 'OPEN' | 'PARTIAL' | 'RECEIVED';
  quantity_reversed: number;
  bin_decrements: Array<{ bin_id: number; quantity: number }>;
};

export const ReceiptHistoryMapper = {
  toEntry(dto: ReceiptHistoryEntryDto): ReceiptHistoryEntry {
    return {
      receiptId: dto.receipt_id, poLineId: dto.po_line_id, lineNumber: dto.line_number,
      itemId: dto.item_id, sku: dto.sku, itemName: dto.item_name,
      quantityReceived: dto.quantity_received, binId: dto.bin_id, binCode: dto.bin_code,
      warehouseId: dto.warehouse_id, receivedBy: dto.received_by, receivedAt: dto.received_at,
      lotNumber: dto.lot_number, serialNumber: dto.serial_number, notes: dto.notes
    };
  },
  toUnreceiveResult(dto: UnreceiveResponseDto) {
    return {
      message: dto.message, receiptId: dto.receipt_id, poId: dto.po_id,
      poStatus: dto.po_status, quantityReversed: dto.quantity_reversed,
      binDecrements: dto.bin_decrements.map(row => ({ binId: row.bin_id, quantity: row.quantity }))
    };
  }
};
