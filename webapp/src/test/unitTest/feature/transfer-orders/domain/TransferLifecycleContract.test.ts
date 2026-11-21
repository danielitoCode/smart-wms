import { describe, expect, it } from 'vitest';
import { canAccessTransferWarehouses } from '../../../../../core/feature/transfer-orders/domain/policy/TransferWarehouseScopePolicy';
import { createR5TransferUseCases, isTransferLifecycleExecutable, R5_TRANSFER_CAPABILITIES, TransferLifecycleNotSupportedError } from '../../../../../core/feature/transfer-orders/domain/contract/TransferLifecycleContract';

describe('R5 transfer warehouse scope', () => {
  it('requires access to both source and destination independently', () => {
    expect(canAccessTransferWarehouses({ role: 'USER', assignedWarehouseIds: [1], sourceWarehouseId: 1, destinationWarehouseId: 2 })).toBe(false);
    expect(canAccessTransferWarehouses({ role: 'USER', assignedWarehouseIds: [2], sourceWarehouseId: 1, destinationWarehouseId: 2 })).toBe(false);
    expect(canAccessTransferWarehouses({ role: 'USER', assignedWarehouseIds: [1, 2], sourceWarehouseId: 1, destinationWarehouseId: 2 })).toBe(true);
  });

  it('allows ADMIN while still requiring distinct valid warehouses', () => {
    expect(canAccessTransferWarehouses({ role: 'ADMIN', assignedWarehouseIds: [], sourceWarehouseId: 1, destinationWarehouseId: 2 })).toBe(true);
    expect(canAccessTransferWarehouses({ role: 'ADMIN', assignedWarehouseIds: [], sourceWarehouseId: 1, destinationWarehouseId: 1 })).toBe(false);
  });
});

describe('R5 future server contract', () => {
  it('does not declare the full logistics lifecycle executable with current Flask contracts', () => {
    expect(R5_TRANSFER_CAPABILITIES.dispatchTransfer).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R5_TRANSFER_CAPABILITIES.receiveTransfer).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R5_TRANSFER_CAPABILITIES.putAwayTransfer).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R5_TRANSFER_CAPABILITIES.exactReservationLedger).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R5_TRANSFER_CAPABILITIES.inventoryInTransitLedger).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(isTransferLifecycleExecutable()).toBe(false);
  });

  it('exposes all ten named future use cases without pretending they are implemented', () => {
    const useCases = createR5TransferUseCases();
    expect(Object.keys(useCases)).toEqual(['CreateTransfer', 'GetTransfer', 'ReserveTransferStock', 'StartTransferPicking', 'SubmitPickedQuantities', 'ShortCloseTransfer', 'DispatchTransfer', 'ReceiveTransfer', 'PutAwayTransfer', 'CancelTransfer']);
    let caught: unknown;
    try { useCases.ReceiveTransfer.execute({}); } catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(TransferLifecycleNotSupportedError);
    expect((caught as TransferLifecycleNotSupportedError).code).toBe('NOT_SUPPORTED_BY_SERVER');
  });

  it('exposes an explicit unsupported-operation error', () => {
    const error = new TransferLifecycleNotSupportedError('dispatchTransfer');
    expect(error.code).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(error.message).toContain('Flask');
  });
});
