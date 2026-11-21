import { describe, expect, it } from 'vitest';
import {
  R6_PICKING_CAPABILITIES,
  R6OperationNotSupportedError,
  isR6CapabilityAvailable,
  isR6PickingMutationSafe,
  isR6PickingExecutionAvailable
} from '../../../../../core/feature/picking/domain/contract/R6PickingLifecycleContract';

describe('R6 picking lifecycle capabilities', () => {
  it('keeps reads available only where Flask exposes the scanner contracts', () => {
    expect(isR6CapabilityAvailable('getPickBatch')).toBe(true);
    expect(isR6CapabilityAvailable('getNextPickTask')).toBe(true);
    expect(isR6CapabilityAvailable('listPickTickets')).toBe(false);
    expect(isR6CapabilityAvailable('getShipment')).toBe(false);
  });

  it('does not enable mutations without task locks, bin validation and replay guarantees', () => {
    expect(R6_PICKING_CAPABILITIES.confirmPick).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R6_PICKING_CAPABILITIES.shortPick).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R6_PICKING_CAPABILITIES.itemAndBinBarcodeValidation).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(R6_PICKING_CAPABILITIES.idempotentWaveReplay).toBe('NOT_SUPPORTED_BY_SERVER');
    expect(isR6PickingMutationSafe()).toBe(false);
    expect(isR6PickingExecutionAvailable()).toBe(false);
  });

  it('exposes a typed actionable error instead of fabricating local success', () => {
    const error = new R6OperationNotSupportedError('confirmPick');
    expect(error).toBeInstanceOf(Error);
    expect(error.code).toBe('R6_CAPABILITY_BLOCKED');
    expect(error.operation).toBe('confirmPick');
  });
});
