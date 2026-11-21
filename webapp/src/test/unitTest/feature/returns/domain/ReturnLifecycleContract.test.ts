import { describe, expect, it } from 'vitest';
import { RETURN_BACKEND_CONTRACT, RETURN_CAPABILITIES, ReturnCapabilityNotSupportedError } from '../../../../../core/feature/returns/domain/contract/ReturnLifecycleContract';
import { ApproveRMAUseCase, ClassifyReturnedItemUseCase, RestockReturnUseCase } from '../../../../../core/feature/returns/domain/usecase/ReturnUseCases';

describe('R7 return capability gates', () => {
  it('marks approval, condition classification and separate restock as unsupported', () => {
    expect(RETURN_CAPABILITIES.approveRma).toBe('NOT_SUPPORTED');
    expect(RETURN_CAPABILITIES.classifyReturnedItem).toBe('NOT_SUPPORTED');
    expect(RETURN_CAPABILITIES.restockReturn).toBe('NOT_SUPPORTED');
    expect(RETURN_BACKEND_CONTRACT.receiveReturn.sideEffect).toBe('RECEIPT_AND_INVENTORY_RESTOCK');
  });
  it('fails closed without making a repository call', () => {
    expect(() => new ApproveRMAUseCase().execute()).toThrowError(ReturnCapabilityNotSupportedError);
    expect(() => new ClassifyReturnedItemUseCase().execute()).toThrowError(ReturnCapabilityNotSupportedError);
    expect(() => new RestockReturnUseCase().execute()).toThrowError(ReturnCapabilityNotSupportedError);
  });
});
