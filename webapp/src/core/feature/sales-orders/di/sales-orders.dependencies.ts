import { apiClient } from '../../../infrastructure/api/ApiClient';
import { SalesOrderRemoteDataSource } from '../data/datasource/SalesOrderRemoteDataSource';
import { SalesOrderRepositoryImpl } from '../data/repository/SalesOrderRepositoryImpl';
import { CancelSalesOrderUseCase } from '../domain/usecase/CancelSalesOrderUseCase';
import { CreateSalesOrderUseCase } from '../domain/usecase/CreateSalesOrderUseCase';
import { GetSalesOrderUseCase } from '../domain/usecase/GetSalesOrderUseCase';
import { GetRelatedSalesOrdersUseCase } from '../domain/usecase/GetRelatedSalesOrdersUseCase';
import { ListSalesOrdersUseCase } from '../domain/usecase/ListSalesOrdersUseCase';
import { UpdateSalesOrderUseCase } from '../domain/usecase/UpdateSalesOrderUseCase';
import { UpdateSalesOrderAddressUseCase } from '../domain/usecase/UpdateSalesOrderAddressUseCase';
import {
  AddSalesOrderLineUseCase, UpdateSalesOrderLineUseCase, DeleteSalesOrderLineUseCase
} from '../domain/usecase/ManageSalesOrderLinesUseCase';
import {
  AdminPickSalesOrderUseCase, AdminShipSalesOrderUseCase,
  PartialFulfillSalesOrderUseCase, RevertSalesOrderStatusUseCase
} from '../domain/usecase/FulfillSalesOrderUseCases';
import {
  CreateSalesOrderRmaUseCase, ReceiveSalesOrderReturnUseCase,
  VoidSalesOrderReturnUseCase
} from '../domain/usecase/ManageSalesOrderReturnsUseCases';

export function createSalesOrdersDependencies() {
  const datasource = new SalesOrderRemoteDataSource(apiClient);
  const repository = new SalesOrderRepositoryImpl(datasource);
  return {
    repository,
    listSalesOrders: new ListSalesOrdersUseCase(repository),
    getSalesOrder: new GetSalesOrderUseCase(repository),
    getRelatedSalesOrders: new GetRelatedSalesOrdersUseCase(repository),
    createSalesOrder: new CreateSalesOrderUseCase(repository),
    updateSalesOrder: new UpdateSalesOrderUseCase(repository),
    updateSalesOrderAddress: new UpdateSalesOrderAddressUseCase(repository),
    cancelSalesOrder: new CancelSalesOrderUseCase(repository),
    addSalesOrderLine: new AddSalesOrderLineUseCase(repository),
    updateSalesOrderLine: new UpdateSalesOrderLineUseCase(repository),
    deleteSalesOrderLine: new DeleteSalesOrderLineUseCase(repository),
    adminPickSalesOrder: new AdminPickSalesOrderUseCase(repository),
    adminShipSalesOrder: new AdminShipSalesOrderUseCase(repository),
    partialFulfillSalesOrder: new PartialFulfillSalesOrderUseCase(repository),
    revertSalesOrderStatus: new RevertSalesOrderStatusUseCase(repository),
    createSalesOrderRma: new CreateSalesOrderRmaUseCase(repository),
    receiveSalesOrderReturn: new ReceiveSalesOrderReturnUseCase(repository),
    voidSalesOrderReturn: new VoidSalesOrderReturnUseCase(repository)
  };
}

export type SalesOrdersDependencies = ReturnType<typeof createSalesOrdersDependencies>;
