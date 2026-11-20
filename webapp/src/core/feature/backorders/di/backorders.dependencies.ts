import { apiClient } from '../../../infrastructure/api/ApiClient';
import { BackordersRemoteDataSource } from '../data/datasource/BackordersRemoteDataSource';
import { BackordersRepositoryImpl } from '../data/repository/BackordersRepositoryImpl';
import {
  CancelBackorderUseCase, GetBackorderAuditHistoryUseCase, GetBackorderDetailUseCase, ListBackordersUseCase
} from '../domain/usecase/BackorderUseCases';
import { createSalesOrdersDependencies } from '../../sales-orders/di/sales-orders.dependencies';

export function createBackordersDependencies() {
  const salesOrders = createSalesOrdersDependencies().repository;
  const repository = new BackordersRepositoryImpl(
    new BackordersRemoteDataSource(apiClient),
    salesOrders
  );
  return {
    repository,
    list: new ListBackordersUseCase(repository),
    detail: new GetBackorderDetailUseCase(repository),
    auditHistory: new GetBackorderAuditHistoryUseCase(repository),
    cancel: new CancelBackorderUseCase(repository)
  };
}
