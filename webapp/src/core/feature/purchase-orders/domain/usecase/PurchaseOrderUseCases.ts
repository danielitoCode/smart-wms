import type {
  AddPurchaseOrderLine, CreatePurchaseOrder, ListPurchaseOrdersParams,
  UpdatePurchaseOrder, UpdatePurchaseOrderLine
} from '../entity/PurchaseOrder';
import type { PurchaseOrdersRepository } from '../repository/PurchaseOrdersRepository';

function assertId(value: number, field: string): void {
  if (!Number.isInteger(value) || value < 1) throw new Error(`${field} must be an integer >= 1`);
}
function assertQuantity(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 1_000_000) {
    throw new Error('quantityOrdered must be an integer between 1 and 1000000');
  }
}
function assertUnitCost(value: number | null | undefined): void {
  if (value != null && (!Number.isFinite(value) || value < 0)) {
    throw new Error('unitCost must be a finite number >= 0');
  }
}

export class ListPurchaseOrdersUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(input: ListPurchaseOrdersParams = {}) {
    if (input.page != null) assertId(input.page, 'page');
    if (input.perPage != null && (!Number.isInteger(input.perPage) || input.perPage < 1 || input.perPage > 1000)) {
      throw new Error('perPage must be an integer between 1 and 1000');
    }
    if (input.warehouseId != null) assertId(input.warehouseId, 'warehouseId');
    if (input.dateFrom && input.dateTo && input.dateFrom > input.dateTo) {
      throw new Error('dateFrom cannot be after dateTo');
    }
    return this.repository.list({ ...input, search: input.search?.trim() || undefined });
  }
}

export class GetPurchaseOrderUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number) { assertId(id, 'purchaseOrderId'); return this.repository.detail(id); }
}

export class CreatePurchaseOrderUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(input: CreatePurchaseOrder) {
    if (!input.poNumber.trim()) throw new Error('poNumber is required');
    assertId(input.warehouseId, 'warehouseId');
    if (!Array.isArray(input.lines) || input.lines.length === 0) throw new Error('At least one purchase order line is required');
    const itemIds = new Set<number>();
    for (const line of input.lines) {
      assertId(line.itemId, 'itemId');
      assertQuantity(line.quantityOrdered);
      assertUnitCost(line.unitCost);
      if (itemIds.has(line.itemId)) throw new Error(`duplicate itemId: ${line.itemId}`);
      itemIds.add(line.itemId);
    }
    return this.repository.create({ ...input, poNumber: input.poNumber.trim() });
  }
}

export class UpdatePurchaseOrderUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number, input: UpdatePurchaseOrder) {
    assertId(id, 'purchaseOrderId');
    if (!Object.keys(input).length) throw new Error('At least one purchase order field is required');
    if (input.poNumber !== undefined && !input.poNumber.trim()) throw new Error('poNumber is required');
    return this.repository.update(id, input);
  }
}

export class AddPurchaseOrderLineUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number, input: AddPurchaseOrderLine) {
    assertId(id, 'purchaseOrderId'); assertId(input.itemId, 'itemId');
    assertQuantity(input.quantityOrdered); assertUnitCost(input.unitCost);
    return this.repository.addLine(id, input);
  }
}

export class UpdatePurchaseOrderLineUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number, lineId: number, input: UpdatePurchaseOrderLine) {
    assertId(id, 'purchaseOrderId'); assertId(lineId, 'poLineId'); assertQuantity(input.quantityOrdered);
    return this.repository.updateLine(id, lineId, input);
  }
}

export class DeletePurchaseOrderLineUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number, lineId: number) {
    assertId(id, 'purchaseOrderId'); assertId(lineId, 'poLineId');
    return this.repository.deleteLine(id, lineId);
  }
}

export class ListPurchaseOrderReceiptsUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number) { assertId(id, 'purchaseOrderId'); return this.repository.listReceipts(id); }
}

export class ClosePurchaseOrderUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number) { assertId(id, 'purchaseOrderId'); return this.repository.close(id); }
}

export class ReopenPurchaseOrderUseCase {
  constructor(private readonly repository: PurchaseOrdersRepository) {}
  execute(id: number) { assertId(id, 'purchaseOrderId'); return this.repository.reopen(id); }
}
