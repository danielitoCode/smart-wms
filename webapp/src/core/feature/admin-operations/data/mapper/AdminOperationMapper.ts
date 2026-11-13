import type {
  AdjustmentProjection,
  AdminOperationRow,
  BackorderProjection,
  InterWarehouseTransferProjection,
  PosActivityProjection,
  PreferredBinProjection,
  PurchaseOrderProjection,
  SalesOrderProjection,
  TransferOrderProjection,
  UserProjection,
  VendorProjection
} from '../../domain/entity/AdminOperation.ts';
import type {
  AdjustmentDto,
  BackorderDto,
  InterWarehouseTransferDto,
  PosActivityDto,
  PosActivitySummaryDto,
  PreferredBinDto,
  PurchaseOrderDto,
  SalesOrderDto,
  TransferOrderDto,
  UserDto,
  VendorDto
} from '../dto/AdminOperationDto';

function mapBackorder(value: BackorderDto): Extract<AdminOperationRow, { feature: 'backorders' }> {
  const data: BackorderProjection = {
    salesOrderNumber: value.so_number,
    parentSalesOrderNumber: value.parent_so_number,
    customerName: value.customer_name,
    status: value.status,
    daysWaiting: value.days_waiting,
    items: value.items.map((item) => ({
      sku: item.sku,
      itemName: item.item_name,
      quantity: item.qty,
      openPurchaseOrder: item.open_po
        ? {
            number: item.open_po.po_number,
            expectedDate: item.open_po.expected_date,
            quantityRemaining: item.open_po.quantity_remaining
          }
        : null
    }))
  };

  return { feature: 'backorders', id: value.so_id, data };
}

function mapAdjustment(
  feature: 'count-approvals' | 'adjustments',
  value: AdjustmentDto
): Extract<AdminOperationRow, { feature: 'count-approvals' }> | Extract<AdminOperationRow, { feature: 'adjustments' }> {
  const data: AdjustmentProjection = {
    adjustmentId: value.adjustment_id,
    cycleCountId: value.cycle_count_id,
    sku: value.sku,
    itemName: value.item_name,
    binCode: value.bin_code,
    expectedQuantity: value.expected_quantity ?? null,
    countedQuantity: value.counted_quantity ?? null,
    quantityChange: value.quantity_change,
    reasonCode: value.reason_code,
    reasonDetail: value.reason_detail,
    status: value.status,
    adjustedBy: value.username ?? value.adjusted_by,
    adjustedAt: value.adjusted_at
  };

  return feature === 'count-approvals'
    ? { feature, id: value.adjustment_id, data }
    : { feature, id: value.adjustment_id, data };
}

function mapSalesOrder(
  feature: 'fraud' | 'refunds' | 'returns',
  value: SalesOrderDto
): Extract<AdminOperationRow, { feature: 'fraud' }> | Extract<AdminOperationRow, { feature: 'refunds' }> | Extract<AdminOperationRow, { feature: 'returns' }> {
  const data: SalesOrderProjection = {
    salesOrderNumber: value.so_number,
    parentSalesOrderNumber: value.parent_so_number ?? null,
    customerName: value.customer_name,
    customerPhone: value.customer_phone ?? null,
    orderSource: value.order_source ?? value.order_origin ?? null,
    status: value.status,
    createdAt: value.created_at,
    memo: value.memo ?? null,
    orderTotal: value.order_total ?? null
  };

  switch (feature) {
    case 'fraud': return { feature, id: value.so_id, data };
    case 'refunds': return { feature, id: value.so_id, data };
    case 'returns': return { feature, id: value.so_id, data };
  }
}

function mapInterWarehouseTransfer(value: InterWarehouseTransferDto): Extract<AdminOperationRow, { feature: 'inter-warehouse-transfers' }> {
  const data: InterWarehouseTransferProjection = {
    transferId: value.transfer_id,
    sku: value.sku,
    itemName: value.item_name,
    quantity: value.quantity,
    sourceWarehouseName: value.from_warehouse_name,
    sourceWarehouseCode: value.from_warehouse_code,
    sourceBinCode: value.from_bin_code,
    destinationWarehouseName: value.to_warehouse_name,
    destinationWarehouseCode: value.to_warehouse_code,
    destinationBinCode: value.to_bin_code,
    transferredBy: value.transferred_by,
    transferredAt: value.transferred_at,
    status: value.status
  };

  return { feature: 'inter-warehouse-transfers', id: value.transfer_id, data };
}

function mapPosActivity(value: PosActivityDto): Extract<AdminOperationRow, { feature: 'pos-activity' }> {
  const data: PosActivityProjection = {
    salesOrderNumber: value.so_number,
    createdAt: value.created_at,
    channel: value.channel,
    status: value.status,
    terminalId: value.terminal_id,
    customerName: value.customer_name,
    totalCents: value.total_cents,
    paymentMethod: value.payment_method,
    externalTransactionReference: value.external_txn_ref,
    orderType: value.order_type
  };

  return { feature: 'pos-activity', id: value.so_id, data };
}

function mapPreferredBin(value: PreferredBinDto): Extract<AdminOperationRow, { feature: 'preferred-bins' }> {
  const data: PreferredBinProjection = {
    sku: value.sku,
    itemName: value.item_name,
    binCode: value.bin_code,
    zoneName: value.zone_name,
    priority: value.priority,
    notes: value.notes,
    updatedAt: value.updated_at
  };

  return { feature: 'preferred-bins', id: value.preferred_bin_id, data };
}

function mapPurchaseOrder(value: PurchaseOrderDto): Extract<AdminOperationRow, { feature: 'purchase-orders' }> {
  const data: PurchaseOrderProjection = {
    purchaseOrderNumber: value.po_number,
    vendorName: value.vendor_name,
    warehouseId: value.warehouse_id,
    status: value.status,
    expectedDate: value.expected_date,
    createdAt: value.created_at,
    receivedAt: value.received_at ?? null,
    createdBy: value.created_by ?? null
  };

  return { feature: 'purchase-orders', id: value.po_id, data };
}

function mapTransferOrder(value: TransferOrderDto): Extract<AdminOperationRow, { feature: 'transfer-orders' }> {
  const data: TransferOrderProjection = {
    transferOrderNumber: value.to_number,
    sourceWarehouseId: value.source_warehouse_id,
    destinationWarehouseId: value.destination_warehouse_id,
    status: value.status,
    createdBy: value.created_by,
    notes: value.notes,
    createdAt: value.created_at,
    updatedAt: value.updated_at
  };

  return { feature: 'transfer-orders', id: value.to_id, data };
}

function mapUser(value: UserDto): Extract<AdminOperationRow, { feature: 'users' }> {
  const data: UserProjection = {
    username: value.username,
    fullName: value.full_name,
    role: value.role,
    active: value.is_active,
    warehouseIds: value.warehouse_ids,
    allowedFunctions: value.allowed_functions,
    createdAt: value.created_at,
    lastLogin: value.last_login
  };

  return { feature: 'users', id: value.user_id, data };
}

function mapVendor(value: VendorDto): Extract<AdminOperationRow, { feature: 'vendors' }> {
  const data: VendorProjection = {
    vendorName: value.vendor_name,
    contactName: value.contact_name,
    email: value.email,
    phone: value.phone,
    paymentTerms: value.payment_terms,
    active: value.is_active
  };

  return { feature: 'vendors', id: value.canonical_id, data };
}

export const AdminOperationMapper = {
  backorders(values: BackorderDto[]) {
    return values.map(mapBackorder);
  },
  countApprovals(values: AdjustmentDto[]) {
    return values.map((value) => mapAdjustment('count-approvals', value));
  },
  adjustments(values: AdjustmentDto[]) {
    return values.map((value) => mapAdjustment('adjustments', value));
  },
  fraud(values: SalesOrderDto[]) {
    return values.map((value) => mapSalesOrder('fraud', value));
  },
  refunds(values: SalesOrderDto[]) {
    return values.map((value) => mapSalesOrder('refunds', value));
  },
  returns(values: SalesOrderDto[]) {
    return values.map((value) => mapSalesOrder('returns', value));
  },
  interWarehouseTransfers(values: InterWarehouseTransferDto[]) {
    return values.map(mapInterWarehouseTransfer);
  },
  posActivity(values: PosActivityDto[]) {
    return values.map(mapPosActivity);
  },
  preferredBins(values: PreferredBinDto[]) {
    return values.map(mapPreferredBin);
  },
  purchaseOrders(values: PurchaseOrderDto[]) {
    return values.map(mapPurchaseOrder);
  },
  transferOrders(values: TransferOrderDto[]) {
    return values.map(mapTransferOrder);
  },
  users(values: UserDto[]) {
    return values.map(mapUser);
  },
  vendors(values: VendorDto[]) {
    return values.map(mapVendor);
  },
  posSummary(value: PosActivitySummaryDto) {
    return {
      date: value.date,
      isToday: value.is_today,
      today: {
        salesCount: value.today.sales_count,
        refundCount: value.today.refund_count,
        netCents: value.today.net_cents,
        salesTotalCents: value.today.sales_total_cents,
        refundTotalCents: value.today.refund_total_cents,
        averageSaleCents: value.today.avg_sale_cents,
        counterCents: value.today.counter_cents,
        counterCount: value.today.counter_count,
        phoneCents: value.today.phone_cents,
        phoneCount: value.today.phone_count
      },
      week: {
        thisTotalCents: value.week.this_total_cents,
        lastTotalCents: value.week.last_total_cents
      },
      activeTerminals: value.active_terminals,
      differenceFromYesterdayCents: value.vs_yesterday_cents
    };
  }
};
