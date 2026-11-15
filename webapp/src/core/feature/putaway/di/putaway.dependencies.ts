import { apiClient } from '../../../infrastructure/api/ApiClient';
import { PutawayRemoteDataSource } from '../data/datasource/PutawayRemoteDataSource';
import { PutawayRepositoryImpl } from '../data/repository/PutawayRepositoryImpl';
import { ListPendingPutawayUseCase } from '../domain/usecase/ListPendingPutawayUseCase';
import { StagingSummaryUseCase } from '../domain/usecase/StagingSummaryUseCase';
import { SuggestDestinationUseCase } from '../domain/usecase/SuggestDestinationUseCase';
import { ConfirmPutawayUseCase } from '../domain/usecase/ConfirmPutawayUseCase';
import { UpdatePreferredBinUseCase } from '../domain/usecase/UpdatePreferredBinUseCase';

export function createPutawayDependencies() {
	const datasource = new PutawayRemoteDataSource(apiClient);
	const repository = new PutawayRepositoryImpl(datasource);
	return {
		listPending: new ListPendingPutawayUseCase(repository),
		stagingSummary: new StagingSummaryUseCase(repository),
		suggestDestination: new SuggestDestinationUseCase(repository),
		confirm: new ConfirmPutawayUseCase(repository),
		updatePreferredBin: new UpdatePreferredBinUseCase(repository)
	};
}
export type PutawayDependencies = ReturnType<typeof createPutawayDependencies>;
