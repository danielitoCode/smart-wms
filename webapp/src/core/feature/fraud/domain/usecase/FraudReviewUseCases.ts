import type { FraudReviewRepository } from '../repository/FraudReviewRepository';

export class ListFraudReviewsUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(warehouseId: number, query = '') {
    if (!Number.isSafeInteger(warehouseId) || warehouseId <= 0) {
      throw new Error('Selecciona un almacén válido');
    }
    return this.repository.list(warehouseId, query.trim());
  }
}

export class GetFraudReviewDetailUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    return this.repository.getDetail(id);
  }
}

export class UpdateFraudMemoUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number, memo: string) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    if (memo.length > 4000) throw new Error('La observación supera el límite permitido');
    return this.repository.updateMemo(id, memo);
  }
}

export class PushFraudOrderToQueueUseCase {
  constructor(private readonly repository: FraudReviewRepository) {}

  execute(id: number) {
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Pedido no válido');
    return this.repository.pushToQueue(id);
  }
}
