import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ShippingRemoteDataSource } from '../data/datasource/ShippingRemoteDataSource';
import { ShippingRepositoryImpl } from '../data/repository/ShippingRepositoryImpl';
import { LoadShippingOrderUseCase } from '../domain/usecase/LoadShippingOrderUseCase';
import { FulfillShipmentUseCase } from '../domain/usecase/FulfillShipmentUseCase';

export function createShippingDependencies() {
	const datasource = new ShippingRemoteDataSource(apiClient);
	const repository = new ShippingRepositoryImpl(datasource);
	return {
		loadOrder: new LoadShippingOrderUseCase(repository),
		fulfill: new FulfillShipmentUseCase(repository)
	};
}

export type ShippingDependencies = ReturnType<typeof createShippingDependencies>;
