/**
 * R5 future contract for a warehouse-to-warehouse logistics lifecycle.
 *
 * The current Flask API does not expose an exact, line/bin reservation ledger
 * plus dispatch, in-transit, destination receipt and put-away as separate
 * idempotent operations. Existing Transfer Orders approval moves stock
 * directly; the inter-warehouse endpoint moves stock immediately.
 *
 * Keep these ports explicit until Flask implements the full lifecycle. UI
 * actions must remain disabled; no client-side stock mutation is permitted.
 */
export type TransferLifecycleCapabilityStatus =
  | 'SUPPORTED'
  | 'PARTIAL'
  | 'NOT_SUPPORTED_BY_SERVER';

export const R5_TRANSFER_CAPABILITIES = {
  createTransfer: 'PARTIAL',
  getTransfer: 'PARTIAL',
  reserveTransferStock: 'NOT_SUPPORTED_BY_SERVER',
  startTransferPicking: 'PARTIAL',
  submitPickedQuantities: 'PARTIAL',
  shortCloseTransfer: 'PARTIAL',
  dispatchTransfer: 'NOT_SUPPORTED_BY_SERVER',
  receiveTransfer: 'NOT_SUPPORTED_BY_SERVER',
  putAwayTransfer: 'NOT_SUPPORTED_BY_SERVER',
  cancelTransfer: 'PARTIAL',
  inventoryInTransitLedger: 'NOT_SUPPORTED_BY_SERVER',
  exactReservationLedger: 'NOT_SUPPORTED_BY_SERVER'
} as const satisfies Record<string, TransferLifecycleCapabilityStatus>;

export type TransferLineQuantity = {
  transferLineId: number;
  itemId: number;
  sourceBinId: number;
  destinationBinId: number;
  requestedQuantity: number;
  unitOfMeasure: string;
};

export type CreateTransferCommand = {
  sourceWarehouseId: number;
  destinationWarehouseId: number;
  lines: TransferLineQuantity[];
  idempotencyKey: string;
};

export type ReserveTransferStockCommand = {
  transferId: number;
  expectedVersion: number;
  idempotencyKey: string;
};

export type SubmitPickedQuantitiesCommand = {
  transferId: number;
  expectedVersion: number;
  quantities: Array<{ transferLineId: number; pickedQuantity: number }>;
  idempotencyKey: string;
};

export type DispatchTransferCommand = {
  transferId: number;
  sourceWarehouseId: number;
  expectedVersion: number;
  idempotencyKey: string;
};

export type ReceiveTransferCommand = {
  transferId: number;
  destinationWarehouseId: number;
  expectedVersion: number;
  receivedQuantities: Array<{ transferLineId: number; receivedQuantity: number }>;
  idempotencyKey: string;
};

export type PutAwayTransferCommand = {
  transferId: number;
  destinationWarehouseId: number;
  placements: Array<{ transferLineId: number; binId: number; quantity: number }>;
  expectedVersion: number;
  idempotencyKey: string;
};

export type CancelTransferCommand = {
  transferId: number;
  expectedVersion: number;
  reason: string;
  idempotencyKey: string;
};

export class TransferLifecycleNotSupportedError extends Error {
  readonly code = 'NOT_SUPPORTED_BY_SERVER';

  constructor(operation: keyof typeof R5_TRANSFER_CAPABILITIES) {
    super(`La operación ${operation} no está disponible: Flask todavía no ofrece el contrato transaccional requerido para R5.`);
    this.name = 'TransferLifecycleNotSupportedError';
  }
}

export function isTransferLifecycleExecutable(): boolean {
  return Object.values(R5_TRANSFER_CAPABILITIES).every(status => status === 'SUPPORTED');
}
