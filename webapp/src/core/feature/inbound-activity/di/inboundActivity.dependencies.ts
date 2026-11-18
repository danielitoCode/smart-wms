import { apiClient } from '../../../infrastructure/api/ApiClient';
import { InboundActivityRemoteDataSource } from '../data/datasource/InboundActivityRemoteDataSource';
import { InboundActivityRepositoryImpl } from '../data/repository/InboundActivityRepositoryImpl';
import { ListInboundActivityUseCase, GetInboundActivityDetailUseCase, FilterInboundActivityUseCase } from '../domain/usecase/InboundActivityUseCases';

export function createInboundActivityDependencies() {
	const repository = new InboundActivityRepositoryImpl(new InboundActivityRemoteDataSource(apiClient));
	return {
		list: new ListInboundActivityUseCase(repository),
		filter: new FilterInboundActivityUseCase(repository),
		getDetail: new GetInboundActivityDetailUseCase(repository)
	};
}
