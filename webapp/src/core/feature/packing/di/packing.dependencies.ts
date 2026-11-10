import { apiClient } from '../../../infrastructure/api/ApiClient';
import { PackingRemoteDataSource } from '../data/datasource/PackingRemoteDataSource';
import { PackingRepositoryImpl } from '../data/repository/PackingRepositoryImpl';
import { LoadPackingOrderUseCase } from '../domain/usecase/LoadPackingOrderUseCase';
import { VerifyPackItemUseCase } from '../domain/usecase/VerifyPackItemUseCase';
import { CompletePackingUseCase } from '../domain/usecase/CompletePackingUseCase';

export function createPackingDependencies() {
	const datasource = new PackingRemoteDataSource(apiClient);
	const repository = new PackingRepositoryImpl(datasource);
	return {
		loadOrder: new LoadPackingOrderUseCase(repository),
		verify: new VerifyPackItemUseCase(repository),
		complete: new CompletePackingUseCase(repository)
	};
}

export type PackingDependencies = ReturnType<typeof createPackingDependencies>;
