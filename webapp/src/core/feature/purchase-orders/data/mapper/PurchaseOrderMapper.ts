import type {
  PurchaseOrder, PurchaseOrderLine, PurchaseOrderReceipt, CreatePurchaseOrder,
  UpdatePurchaseOrder, AddPurchaseOrderLine
} from '../../domain/entity/PurchaseOrder';
import type {
  PurchaseOrderDto, PurchaseOrderLineDto, PurchaseOrderReceiptDto
} from '../dto/PurchaseOrderDto';

export const PurchaseOrderMapper = {
  line(dto: PurchaseOrderLineDto): PurchaseOrderLine {
    return {
      poLineId: dto.po_line_id, lineNumber: dto.line_number, itemId: dto.item_id,
      quantityOrdered: dto.quantity_ordered, quantityReceived: dto.quantity_received,
      quantityRemaining: Math.max(0, dto.quantity_ordered - dto.quantity_received),
      unitCost: dto.unit_cost, status: dto.status, sku: dto.sku ?? null,
      itemName: dto.item_name ?? null, upc: dto.upc ?? null, mpn: dto.mpn ?? null
    };
  },
  header(dto: PurchaseOrderDto, lines: PurchaseOrderLineDto[] = []): PurchaseOrder {
    return {
      poId: dto.po_id, poNumber: dto.po_number, poBarcode: dto.po_barcode ?? null,
      vendorId: dto.vendor_id ?? null, vendorName: dto.vendor_name, status: dto.status,
      expectedDate: dto.expected_date, warehouseId: dto.warehouse_id, notes: dto.notes,
      createdAt: dto.created_at, receivedAt: dto.received_at ?? null,
      createdBy: dto.created_by ?? null, lines: lines.map(PurchaseOrderMapper.line)
    };
  },
  receipt(dto: PurchaseOrderReceiptDto): PurchaseOrderReceipt {
    return {
      receiptId: dto.receipt_id, poLineId: dto.po_line_id, lineNumber: dto.line_number,
      itemId: dto.item_id, sku: dto.sku, itemName: dto.item_name,
      quantityReceived: dto.quantity_received, binId: dto.bin_id, binCode: dto.bin_code,
      warehouseId: dto.warehouse_id, receivedBy: dto.received_by, receivedAt: dto.received_at,
      lotNumber: dto.lot_number, serialNumber: dto.serial_number, notes: dto.notes
    };
  },
  create(input: CreatePurchaseOrder) {
    return {
      po_number: input.poNumber, warehouse_id: input.warehouseId,
      lines: input.lines.map(line => ({
        item_id: line.itemId, quantity_ordered: line.quantityOrdered,
        unit_cost: line.unitCost ?? null
      })),
      po_barcode: input.poBarcode ?? null, vendor_name: input.vendorName ?? null,
      expected_date: input.expectedDate ?? null, notes: input.notes ?? null
    };
  },
  update(input: UpdatePurchaseOrder): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (input.poNumber !== undefined) body.po_number = input.poNumber;
    if (input.poBarcode !== undefined) body.po_barcode = input.poBarcode;
    if (input.vendorName !== undefined) body.vendor_name = input.vendorName;
    if (input.expectedDate !== undefined) body.expected_date = input.expectedDate;
    if (input.notes !== undefined) body.notes = input.notes;
    if (input.status !== undefined) body.status = input.status;
    return body;
  },
  addLine(input: AddPurchaseOrderLine) {
    return { item_id: input.itemId, quantity_ordered: input.quantityOrdered, unit_cost: input.unitCost ?? null };
  }
};
