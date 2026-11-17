import type { CreateTransferOrder, TransferOrder, TransferOrderApproval, TransferOrderImportResult, TransferOrderLine, TransferOrderPage, TransferOrderWarehouse } from '../../domain/entity/TransferOrder';
import type { TransferOrderApprovalDto, TransferOrderHeaderDto, TransferOrderImportDto, TransferOrderLineDto, TransferOrderWarehouseDto } from '../dto/TransferOrderDto';

export const TransferOrderMapper = {
  line(dto: TransferOrderLineDto): TransferOrderLine {
    return { toLineId: dto.to_line_id, transferOrderId: dto.to_id, itemId: dto.item_id, lineNumber: dto.line_number, requestedQuantity: dto.requested_qty, committedQuantity: dto.committed_qty, pickedQuantity: dto.picked_qty, approvedQuantity: dto.approved_qty, status: dto.status as TransferOrderLine['status'], sku: dto.sku, itemName: dto.item_name };
  },
  approval(dto: TransferOrderApprovalDto): TransferOrderApproval {
    return { approvalId: dto.to_approval_id, transferOrderId: dto.to_id, submittedBy: dto.submitted_by, submittedAt: dto.submitted_at, approvedBy: dto.approved_by, approvedAt: dto.approved_at, rejectedAt: dto.rejected_at, rejectionReason: dto.rejection_reason, status: dto.status as TransferOrderApproval['status'], externalId: dto.external_id };
  },
  header(dto: TransferOrderHeaderDto, lines: TransferOrderLineDto[] = [], approvals: TransferOrderApprovalDto[] = []): TransferOrder {
    return { transferOrderId: dto.to_id, transferOrderNumber: dto.to_number, sourceWarehouseId: dto.source_warehouse_id, destinationWarehouseId: dto.destination_warehouse_id, status: dto.status as TransferOrder['status'], createdBy: dto.created_by, externalId: dto.external_id, createdAt: dto.created_at, updatedAt: dto.updated_at, notes: dto.notes, lines: lines.map(TransferOrderMapper.line), approvals: approvals.map(TransferOrderMapper.approval) };
  },
  page(dto: { transfer_orders: TransferOrderHeaderDto[]; total: number; page: number; pages: number; per_page: number }): TransferOrderPage {
    return { orders: dto.transfer_orders.map(row => TransferOrderMapper.header(row)), total: dto.total, page: dto.page, pages: dto.pages, perPage: dto.per_page };
  },
  warehouse(dto: TransferOrderWarehouseDto): TransferOrderWarehouse {
    return { warehouseId: dto.id, warehouseCode: dto.code, warehouseName: dto.name, active: true };
  },
  create(input: CreateTransferOrder) {
    return { source_warehouse_code: input.sourceWarehouseCode.trim(), destination_warehouse_code: input.destinationWarehouseCode.trim(), notes: input.notes?.trim() || null, records: input.records.map(row => ({ sku: row.sku.trim(), quantity: row.quantity })) };
  },
  importResult(dto: TransferOrderImportDto): TransferOrderImportResult {
    return { toId: dto.to_id, toNumber: dto.to_number, sourceWarehouseId: dto.source_warehouse_id, destinationWarehouseId: dto.destination_warehouse_id, lineCount: dto.line_count, shortages: (dto.shortages ?? []).map(row => ({ rowIndex: row.row_index, sku: row.sku, requestedQuantity: row.requested_qty, availableQuantity: row.available_qty, committedQuantity: row.committed_qty, shortfall: row.shortfall })) };
  }
};
