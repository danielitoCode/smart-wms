import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ReturnsRemoteDataSource } from '../data/datasource/ReturnsRemoteDataSource';
import { ReturnsRepositoryImpl } from '../data/repository/ReturnsRepositoryImpl';
import * as U from '../domain/usecase/ReturnUseCases';

export function createReturnsDependencies() {
  const r = new ReturnsRepositoryImpl(new ReturnsRemoteDataSource(apiClient));
  return {
    list: new U.ListReturnsUseCase(r),
    originals: new U.SearchReturnableOrdersUseCase(r),
    returnableOrder: new U.GetReturnableOrderUseCase(r),
    create: new U.CreateReturnUseCase(r),
    approve: new U.ApproveRMAUseCase(),
    classify: new U.ClassifyReturnedItemUseCase(),
    restock: new U.RestockReturnUseCase(),
    detail: new U.GetReturnDetailUseCase(r),
    getReturn: new U.GetReturnUseCase(r),
    saveMemo: new U.SaveReturnMemoUseCase(r),
    receive: new U.ReceiveReturnLineUseCase(r),
    receiveReturn: new U.ReceiveReturnUseCase(r),
    voidReturn: new U.VoidReturnUseCase(r),
    warehouses: new U.ListReturnWarehousesUseCase(r),
    bins: new U.SearchReturnBinsUseCase(r),
    receipts: new U.ListReturnReceiptsUseCase(r)
  };
}
