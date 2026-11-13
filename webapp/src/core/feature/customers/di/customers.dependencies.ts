import { apiClient } from '../../../infrastructure/api/ApiClient';
import { CustomerRemoteDataSource } from '../data/datasource/CustomerRemoteDataSource';
import { CustomerRepositoryImpl } from '../data/repository/CustomerRepositoryImpl';
import { SearchCustomersUseCase } from '../domain/usecase/SearchCustomersUseCase';

export function createCustomerDependencies() {
  const repository = new CustomerRepositoryImpl(new CustomerRemoteDataSource(apiClient));
  return {
    search: new SearchCustomersUseCase(repository)
  };
}
