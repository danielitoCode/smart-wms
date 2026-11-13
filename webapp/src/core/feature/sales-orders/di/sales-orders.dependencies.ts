import { apiClient } from '../../../infrastructure/api/ApiClient';
import { SalesOrderRemoteDataSource } from '../data/datasource/SalesOrderRemoteDataSource';
import { SalesOrderRepositoryImpl } from '../data/repository/SalesOrderRepositoryImpl';
import { CancelSalesOrderUseCase } from '../domain/usecase/CancelSalesOrderUseCase';
import { CreateSalesOrderUseCase } from '../domain/usecase/CreateSalesOrderUseCase';
import { GetSalesOrderUseCase } from '../domain/usecase/GetSalesOrderUseCase';
import { ListSalesOrdersUseCase } from '../domain/usecase/ListSalesOrdersUseCase';
import { UpdateSalesOrderUseCase } from '../domain/usecase/UpdateSalesOrderUseCase';
import {
  AddSalesOrderLineUseCase, UpdateSalesOrderLineUseCase, DeleteSalesOrderLineUseCase
} from '../domain/usecase/ManageSalesOrderLinesUseCase';
import { AdminShipSalesOrderUseCase } from '../domain/usecase/FulfillSalesOrderUseCases';

export function createSalesOrdersDependencies() {
  const datasource = new SalesOrderRemoteDataSource(apiClient);
  const repository = new SalesOrderRepositoryImpl(datasource);
  return {
    repository,
    listSalesOrders: new ListSalesOrdersUseCase(repository),
    getSalesOrder: new GetSalesOrderUseCase(repository),
    createSalesOrder: new CreateSalesOrderUseCase(repository),
    updateSalesOrder: new UpdateSalesOrderUseCase(repository),
    cancelSalesOrder: new CancelSalesOrderUseCase(repository),
    addSalesOrderLine: new AddSalesOrderLineUseCase(repository),
    updateSalesOrderLine: new UpdateSalesOrderLineUseCase(repository),
    deleteSalesOrderLine: new DeleteSalesOrderLineUseCase(repository),
    adminShipSalesOrder: new AdminShipSalesOrderUseCase(repository)
  };
}

export type SalesOrdersDependencies = ReturnType<typeof createSalesOrdersDependencies>;
