import type { AdminOperationKey, AdminOperationRow } from '../../domain/entity/AdminOperation.ts';
import type { AdminOperationDto } from '../dto/AdminOperationDto';
import type { AdjustmentDto, BackorderDto, InterWarehouseTransferDto, PosActivityDto, PreferredBinDto, PurchaseOrderDto, SalesOrderDto, TransferOrderDto, UserDto, VendorDto } from '../dto/AdminOperationDto';

const row = (id: string | number, cells: AdminOperationRow['cells']): AdminOperationRow => ({ id, cells });

function mapBackorder(value: BackorderDto): AdminOperationRow {
  const items = value.items.map((item) => {
    const purchaseOrder = item.open_po ? ` · PO ${item.open_po.po_number} (${item.open_po.quantity_remaining})` : '';
    return `${item.sku} × ${item.qty}${purchaseOrder}`;
  }).join(', ');
  return row(value.so_id, { so_number: value.so_number, parent_so_number: value.parent_so_number, customer_name: value.customer_name, status: value.status, days_waiting: value.days_waiting, items });
}

function mapAdjustment(value: AdjustmentDto): AdminOperationRow {
  return row(value.adjustment_id, { adjustment_id: value.adjustment_id, cycle_count_id: value.cycle_count_id, sku: value.sku, item_name: value.item_name, bin_code: value.bin_code, expected_quantity: value.expected_quantity ?? null, counted_quantity: value.counted_quantity ?? null, quantity_change: value.quantity_change, reason_code: value.reason_code, status: value.status, adjusted_by: value.username ?? value.adjusted_by, adjusted_at: value.adjusted_at });
}

function mapSalesOrder(value: SalesOrderDto): AdminOperationRow {
  return row(value.so_id, { so_number: value.so_number, parent_so_number: value.parent_so_number ?? null, customer_name: value.customer_name, customer_phone: value.customer_phone ?? null, order_source: value.order_source ?? value.order_origin ?? null, status: value.status, created_at: value.created_at, memo: value.memo ?? null, order_total: value.order_total ?? null });
}

function mapInterWarehouseTransfer(value: InterWarehouseTransferDto): AdminOperationRow {
  return row(value.transfer_id, { transfer_id: value.transfer_id, sku: value.sku, item_name: value.item_name, quantity: value.quantity, from_warehouse_name: value.from_warehouse_name, from_bin_code: value.from_bin_code, to_warehouse_name: value.to_warehouse_name, to_bin_code: value.to_bin_code, transferred_by: value.transferred_by, transferred_at: value.transferred_at, status: value.status });
}

function mapPosActivity(value: PosActivityDto): AdminOperationRow {
  return row(value.so_id, { so_number: value.so_number, created_at: value.created_at, channel: value.channel, status: value.status, terminal_id: value.terminal_id, customer_name: value.customer_name, total_cents: value.total_cents, payment_method: value.payment_method, external_txn_ref: value.external_txn_ref });
}

function mapPreferredBin(value: PreferredBinDto): AdminOperationRow {
  return row(value.preferred_bin_id, { sku: value.sku, item_name: value.item_name, bin_code: value.bin_code, zone_name: value.zone_name, priority: value.priority, updated_at: value.updated_at });
}

function mapPurchaseOrder(value: PurchaseOrderDto): AdminOperationRow {
  return row(value.po_id, { po_number: value.po_number, vendor_name: value.vendor_name, warehouse_id: value.warehouse_id, status: value.status, expected_date: value.expected_date, created_at: value.created_at });
}

function mapTransferOrder(value: TransferOrderDto): AdminOperationRow {
  return row(value.to_id, { to_number: value.to_number, source_warehouse_id: value.source_warehouse_id, destination_warehouse_id: value.destination_warehouse_id, status: value.status, created_by: value.created_by, created_at: value.created_at });
}

function mapUser(value: UserDto): AdminOperationRow {
  return row(value.user_id, { username: value.username, full_name: value.full_name, role: value.role, is_active: value.is_active, warehouse_ids: value.warehouse_ids.join(', '), created_at: value.created_at });
}

function mapVendor(value: VendorDto): AdminOperationRow {
  return row(value.canonical_id, { vendor_name: value.vendor_name, contact_name: value.contact_name, email: value.email, phone: value.phone, payment_terms: value.payment_terms, is_active: value.is_active });
}

export const AdminOperationMapper = {
  rows(feature: AdminOperationKey, values: AdminOperationDto[]): AdminOperationRow[] {
    switch (feature) {
      case 'backorders': return (values as BackorderDto[]).map(mapBackorder);
      case 'count-approvals':
      case 'adjustments': return (values as AdjustmentDto[]).map(mapAdjustment);
      case 'fraud':
      case 'refunds':
      case 'returns': return (values as SalesOrderDto[]).map(mapSalesOrder);
      case 'inter-warehouse-transfers': return (values as InterWarehouseTransferDto[]).map(mapInterWarehouseTransfer);
      case 'pos-activity': return (values as PosActivityDto[]).map(mapPosActivity);
      case 'preferred-bins': return (values as PreferredBinDto[]).map(mapPreferredBin);
      case 'purchase-orders': return (values as PurchaseOrderDto[]).map(mapPurchaseOrder);
      case 'transfer-orders': return (values as TransferOrderDto[]).map(mapTransferOrder);
      case 'users': return (values as UserDto[]).map(mapUser);
      case 'vendors': return (values as VendorDto[]).map(mapVendor);
    }
  }
};
