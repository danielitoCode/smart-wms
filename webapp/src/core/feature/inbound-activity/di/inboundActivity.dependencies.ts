import { apiClient } from '../../../infrastructure/api/ApiClient';
import { InboundActivityRemoteDataSource } from '../data/datasource/InboundActivityRemoteDataSource';
import { InboundActivityRepositoryImpl } from '../data/repository/InboundActivityRepositoryImpl';
import { ListInboundActivityUseCase, GetInboundActivityDetailUseCase } from '../domain/usecase/InboundActivityUseCases';

export function createInboundActivityDependencies() {
	const repository = new InboundActivityRepositoryImpl(new InboundActivityRemoteDataSource(apiClient));
	return {
		list: new ListInboundActivityUseCase(repository),
		getDetail: new GetInboundActivityDetailUseCase(repository)
	};
}
