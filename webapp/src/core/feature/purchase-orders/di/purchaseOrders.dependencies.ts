import { apiClient } from '../../../infrastructure/api/ApiClient';
import { PurchaseOrdersRemoteDataSource } from '../data/datasource/PurchaseOrdersRemoteDataSource';
import { PurchaseOrdersRepositoryImpl } from '../data/repository/PurchaseOrdersRepositoryImpl';
import {
  AddPurchaseOrderLineUseCase, ClosePurchaseOrderUseCase, CreatePurchaseOrderUseCase,
  DeletePurchaseOrderLineUseCase, GetPurchaseOrderUseCase, ListPurchaseOrderReceiptsUseCase,
  ListPurchaseOrdersUseCase, ReopenPurchaseOrderUseCase, UpdatePurchaseOrderLineUseCase,
  UpdatePurchaseOrderUseCase
} from '../domain/usecase/PurchaseOrderUseCases';

export function createPurchaseOrdersDependencies() {
  const repository = new PurchaseOrdersRepositoryImpl(new PurchaseOrdersRemoteDataSource(apiClient));
  return {
    list: new ListPurchaseOrdersUseCase(repository),
    detail: new GetPurchaseOrderUseCase(repository),
    create: new CreatePurchaseOrderUseCase(repository),
    update: new UpdatePurchaseOrderUseCase(repository),
    addLine: new AddPurchaseOrderLineUseCase(repository),
    updateLine: new UpdatePurchaseOrderLineUseCase(repository),
    deleteLine: new DeletePurchaseOrderLineUseCase(repository),
    receipts: new ListPurchaseOrderReceiptsUseCase(repository),
    close: new ClosePurchaseOrderUseCase(repository),
    reopen: new ReopenPurchaseOrderUseCase(repository)
  };
}
