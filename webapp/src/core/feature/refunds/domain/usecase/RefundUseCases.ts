import type { RefundsRepository } from '../repository/RefundsRepository';
import { RefundCapabilityNotSupportedError } from '../contract/RefundLifecycleContract';

export class ListRefundsUseCase {
  constructor(private repository: RefundsRepository) {}
  execute(query?: { status?: string; search?: string }) { return this.repository.list(query); }
}

export class GetRefundDetailUseCase {
  constructor(private repository: RefundsRepository) {}
  execute(id: number) {
    if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador de reembolso inválido');
    return this.repository.detail(id);
  }
}

export class GetRefundUseCase extends GetRefundDetailUseCase {}
export class CreateRefundUseCase {
  execute(): never { throw new RefundCapabilityNotSupportedError('createRefund'); }
}
