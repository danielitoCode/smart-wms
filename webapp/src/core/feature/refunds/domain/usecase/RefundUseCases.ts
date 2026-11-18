import type { RefundsRepository } from '../repository/RefundsRepository';

export class ListRefundsUseCase {
  constructor(private repository: RefundsRepository) {}
  execute(query?: { status?: string; search?: string }) {
    return this.repository.list(query);
  }
}

export class GetRefundDetailUseCase {
  constructor(private repository: RefundsRepository) {}
  execute(id: number) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('Identificador de reembolso inválido');
    }
    return this.repository.detail(id);
  }
}
