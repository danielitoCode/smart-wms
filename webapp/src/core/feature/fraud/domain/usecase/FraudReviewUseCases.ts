import type { FraudReviewRepository } from '../repository/FraudReviewRepository';

export class ListFraudReviewsUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(warehouseId: number, query = '', page = 1) {
    if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
      throw new Error('Selecciona un almacén válido');
    }
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('Página no válida');
    return this.repository.list(warehouseId, query.trim(), page);
  }
}

export class GetFraudReviewDetailUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    return this.repository.getDetail(id);
  }
}

export class GetFraudAuditHistoryUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number, page = 1) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('Página no válida');
    return this.repository.getAuditHistory(id, page);
  }
}

export class UpdateFraudMemoUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number, memo: string, expectedMemo: string | null) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    if (memo.length > 4000) throw new Error('La observación supera el límite permitido');
    return this.repository.updateMemo(id, memo, expectedMemo);
  }
}

export class PushFraudOrderToQueueUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    return this.repository.pushToQueue(id);
  }
}
