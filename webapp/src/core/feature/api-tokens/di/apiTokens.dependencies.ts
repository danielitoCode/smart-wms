import { apiClient } from '../../../infrastructure/api/ApiClient';
import { ApiTokensRemoteDataSource } from '../data/datasource/ApiTokensRemoteDataSource';
import { ApiTokensRepositoryImpl } from '../data/repository/ApiTokensRepositoryImpl';
import {
	ListApiTokensUseCase,
	CreateApiTokenUseCase,
	RotateApiTokenUseCase,
	RevokeApiTokenUseCase,
	DeleteApiTokenUseCase,
	GetScopeCatalogUseCase
} from '../domain/usecase/ApiTokensUseCases';

export function createApiTokensDependencies() {
	const repository = new ApiTokensRepositoryImpl(new ApiTokensRemoteDataSource(apiClient));
	return {
		list: new ListApiTokensUseCase(repository),
		create: new CreateApiTokenUseCase(repository),
		rotate: new RotateApiTokenUseCase(repository),
		revoke: new RevokeApiTokenUseCase(repository),
		remove: new DeleteApiTokenUseCase(repository),
		scopeCatalog: new GetScopeCatalogUseCase(repository)
	};
}
