import { apiClient } from '../../../infrastructure/api/ApiClient';
import { SalesOrderRemoteDataSource } from '../data/datasource/SalesOrderRemoteDataSource';
import { SalesOrderRepositoryImpl } from '../data/repository/SalesOrderRepositoryImpl';
import { CancelSalesOrderUseCase } from '../domain/usecase/CancelSalesOrderUseCase';
import { CreateSalesOrderUseCase } from '../domain/usecase/CreateSalesOrderUseCase';
import { GetSalesOrderUseCase } from '../domain/usecase/GetSalesOrderUseCase';
import { ListSalesOrdersUseCase } from '../domain/usecase/ListSalesOrdersUseCase';

export function createSalesOrdersDependencies() {
	const datasource = new SalesOrderRemoteDataSource(apiClient);
	const repository = new SalesOrderRepositoryImpl(datasource);

	return {
		listSalesOrders: new ListSalesOrdersUseCase(repository),
		getSalesOrder: new GetSalesOrderUseCase(repository),
		createSalesOrder: new CreateSalesOrderUseCase(repository),
		cancelSalesOrder: new CancelSalesOrderUseCase(repository)
	};
}

export type SalesOrdersDependencies = ReturnType<typeof createSalesOrdersDependencies>;
