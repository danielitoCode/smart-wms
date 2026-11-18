import { apiClient } from '../../../infrastructure/api/ApiClient';
import { TransferOrdersRemoteDataSource } from '../data/datasource/TransferOrdersRemoteDataSource';
import { TransferOrdersRepositoryImpl } from '../data/repository/TransferOrdersRepositoryImpl';
import * as U from '../domain/usecase/TransferOrderUseCases';

export function createTransferOrdersDependencies() {
  const repository = new TransferOrdersRepositoryImpl(new TransferOrdersRemoteDataSource(apiClient));
  return {
    list: new U.ListTransferOrdersUseCase(repository),
    warehouses: new U.ListTransferOrderWarehousesUseCase(repository),
    detail: new U.GetTransferOrderUseCase(repository),
    pickerDetail: new U.GetPickerTransferOrderUseCase(repository),
    create: new U.CreateTransferOrderUseCase(repository),
    startPicking: new U.StartTransferOrderPickingUseCase(repository),
    submitPickerResult: new U.SubmitPickerResultUseCase(repository),
    approve: new U.ApproveTransferOrderUseCase(repository),
    reject: new U.RejectTransferOrderUseCase(repository),
    cancel: new U.CancelTransferOrderUseCase(repository),
    remove: new U.DeleteTransferOrderUseCase(repository),
    shortClose: new U.ShortCloseTransferOrderLineUseCase(repository)
  };
}
