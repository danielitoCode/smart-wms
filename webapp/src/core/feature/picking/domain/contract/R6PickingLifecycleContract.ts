/**
 * R6 operational contract. These capabilities describe server guarantees,
 * not what the browser can simulate. Mutations remain closed where Flask
 * cannot guarantee task-level serialization, bin validation or safe replay.
 */
export type R6CapabilityStatus = 'SUPPORTED' | 'PARTIAL' | 'NOT_SUPPORTED_BY_SERVER';

export const R6_PICKING_CAPABILITIES = {
  listPickTickets: 'PARTIAL',
  getPickTicket: 'NOT_SUPPORTED_BY_SERVER',
  markPickTicketsPrinted: 'NOT_SUPPORTED_BY_SERVER',
  listPickBatches: 'PARTIAL',
  getPickBatch: 'SUPPORTED',
  createPickBatch: 'PARTIAL',
  getNextPickTask: 'SUPPORTED',
  confirmPick: 'NOT_SUPPORTED_BY_SERVER',
  shortPick: 'NOT_SUPPORTED_BY_SERVER',
  completePicking: 'PARTIAL',
  itemAndBinBarcodeValidation: 'NOT_SUPPORTED_BY_SERVER',
  verifyPacking: 'SUPPORTED',
  confirmPacking: 'SUPPORTED',
  validateShipmentPackage: 'NOT_SUPPORTED_BY_SERVER',
  shipOrder: 'PARTIAL',
  getShipment: 'NOT_SUPPORTED_BY_SERVER',
  idempotentWaveReplay: 'NOT_SUPPORTED_BY_SERVER'
} as const satisfies Record<string, R6CapabilityStatus>;

export type R6PickingOperation = keyof typeof R6_PICKING_CAPABILITIES;

export class R6OperationNotSupportedError extends Error {
  readonly code = 'R6_CAPABILITY_BLOCKED';

  constructor(readonly operation: R6PickingOperation) {
    super(`La operación ${operation} está bloqueada: Flask aún no ofrece las garantías necesarias para R6.`);
    this.name = 'R6OperationNotSupportedError';
  }
}

export function isR6CapabilityAvailable(operation: R6PickingOperation): boolean {
  return R6_PICKING_CAPABILITIES[operation] === 'SUPPORTED';
}

/** Creating a batch reserves/assigns work, so it is gated together with unsafe picking mutations. */
export function isR6PickingMutationSafe(): boolean {
  return (
    isR6CapabilityAvailable('createPickBatch') &&
    isR6CapabilityAvailable('confirmPick') &&
    isR6CapabilityAvailable('shortPick') &&
    isR6CapabilityAvailable('completePicking') &&
    isR6CapabilityAvailable('itemAndBinBarcodeValidation') &&
    isR6CapabilityAvailable('idempotentWaveReplay')
  );
}

/** Picking is executable only when every operation that changes inventory/task state is fully supported. */
export function isR6PickingExecutionAvailable(): boolean {
  return (
    isR6CapabilityAvailable('confirmPick') &&
    isR6CapabilityAvailable('shortPick') &&
    isR6CapabilityAvailable('completePicking') &&
    isR6CapabilityAvailable('itemAndBinBarcodeValidation')
  );
}

/** Shipping cannot execute the R6 contract until the server validates a physical package. */
export function isR6ShippingExecutionAvailable(): boolean {
  return (
    isR6CapabilityAvailable('validateShipmentPackage') &&
    isR6CapabilityAvailable('shipOrder')
  );
}
