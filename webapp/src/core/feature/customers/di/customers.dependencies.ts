import { apiClient } from '../../../infrastructure/api/ApiClient';
import { CustomerRemoteDataSource } from '../data/datasource/CustomerRemoteDataSource';
import { CustomerRepositoryImpl } from '../data/repository/CustomerRepositoryImpl';
import { GetCustomerDetailUseCase } from '../domain/usecase/GetCustomerDetailUseCase';
import { GetCustomerOrdersUseCase } from '../domain/usecase/GetCustomerOrdersUseCase';
import { ListCustomersUseCase } from '../domain/usecase/ListCustomersUseCase';
import { SearchCustomersUseCase } from '../domain/usecase/SearchCustomersUseCase';

export function createCustomersDependencies() {
	const datasource = new CustomerRemoteDataSource(apiClient);
	const repository = new CustomerRepositoryImpl(datasource);
	return {
		listCustomers: new ListCustomersUseCase(repository),
		searchCustomers: new SearchCustomersUseCase(repository),
		getCustomerDetail: new GetCustomerDetailUseCase(repository),
		getCustomerOrders: new GetCustomerOrdersUseCase(repository)
	};
}

export type CustomersDependencies = ReturnType<typeof createCustomersDependencies>;
