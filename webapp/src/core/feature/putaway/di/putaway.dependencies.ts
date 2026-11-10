import { apiClient } from '../../../infrastructure/api/ApiClient';
import { PutawayRemoteDataSource } from '../data/datasource/PutawayRemoteDataSource';
import { PutawayRepositoryImpl } from '../data/repository/PutawayRepositoryImpl';
import { ListPendingPutawayUseCase } from '../domain/usecase/ListPendingPutawayUseCase';
import { ConfirmPutawayUseCase } from '../domain/usecase/ConfirmPutawayUseCase';

export function createPutawayDependencies() {
	const datasource = new PutawayRemoteDataSource(apiClient);
	const repository = new PutawayRepositoryImpl(datasource);

	return {
		listPending: new ListPendingPutawayUseCase(repository),
		confirm: new ConfirmPutawayUseCase(repository)
	};
}

export type PutawayDependencies = ReturnType<typeof createPutawayDependencies>;
