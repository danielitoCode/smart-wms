import { apiClient } from '../../../infrastructure/api/ApiClient';
import { CustomerRemoteDataSource } from '../data/datasource/CustomerRemoteDataSource';
import { CustomerRepositoryImpl } from '../data/repository/CustomerRepositoryImpl';
import { ListCustomersUseCase } from '../domain/usecase/ListCustomersUseCase';

export function createCustomersDependencies() {
	const datasource = new CustomerRemoteDataSource(apiClient);
	const repository = new CustomerRepositoryImpl(datasource);

	return {
		listCustomers: new ListCustomersUseCase(repository)
	};
}

export type CustomersDependencies = ReturnType<typeof createCustomersDependencies>;
