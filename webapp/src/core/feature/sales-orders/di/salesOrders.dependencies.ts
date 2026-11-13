import { apiClient } from '../../../infrastructure/api/ApiClient';
import { SalesOrderRemoteDataSource } from '../data/datasource/SalesOrderRemoteDataSource';
import { SalesOrderRepositoryImpl } from '../data/repository/SalesOrderRepositoryImpl';
import { ListSalesOrdersUseCase } from '../domain/usecase/ListSalesOrdersUseCase';
import { GetSalesOrderUseCase } from '../domain/usecase/GetSalesOrderUseCase';
import { GetRelatedSalesOrdersUseCase } from '../domain/usecase/GetRelatedSalesOrdersUseCase';
import { CreateSalesOrderUseCase } from '../domain/usecase/CreateSalesOrderUseCase';
import { UpdateSalesOrderUseCase } from '../domain/usecase/UpdateSalesOrderUseCase';
import { CancelSalesOrderUseCase } from '../domain/usecase/CancelSalesOrderUseCase';
import {
  AddSalesOrderLineUseCase,
  UpdateSalesOrderLineUseCase,
  DeleteSalesOrderLineUseCase
} from '../domain/usecase/ManageSalesOrderLinesUseCase';
import {
  AdminPickSalesOrderUseCase,
  AdminShipSalesOrderUseCase,
  PartialFulfillSalesOrderUseCase,
  RevertSalesOrderStatusUseCase
} from '../domain/usecase/FulfillSalesOrderUseCases';
import {
  CreateSalesOrderRmaUseCase,
  ReceiveSalesOrderReturnUseCase,
  VoidSalesOrderReturnUseCase
} from '../domain/usecase/ManageSalesOrderReturnsUseCases';

export function createSalesOrderDependencies() {
  const repository = new SalesOrderRepositoryImpl(new SalesOrderRemoteDataSource(apiClient));

  return {
    list: new ListSalesOrdersUseCase(repository),
    get: new GetSalesOrderUseCase(repository),
    related: new GetRelatedSalesOrdersUseCase(repository),
    create: new CreateSalesOrderUseCase(repository),
    update: new UpdateSalesOrderUseCase(repository),
    cancel: new CancelSalesOrderUseCase(repository),
    addLine: new AddSalesOrderLineUseCase(repository),
    updateLine: new UpdateSalesOrderLineUseCase(repository),
    deleteLine: new DeleteSalesOrderLineUseCase(repository),
    adminPick: new AdminPickSalesOrderUseCase(repository),
    adminShip: new AdminShipSalesOrderUseCase(repository),
    partialFulfill: new PartialFulfillSalesOrderUseCase(repository),
    revertStatus: new RevertSalesOrderStatusUseCase(repository),
    createRma: new CreateSalesOrderRmaUseCase(repository),
    receiveReturn: new ReceiveSalesOrderReturnUseCase(repository),
    voidReturn: new VoidSalesOrderReturnUseCase(repository)
  };
}
