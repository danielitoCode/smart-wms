import { apiClient } from '../../../infrastructure/api/ApiClient';
import { AuthRemoteDataSource } from '../data/datasource/AuthRemoteDataSource';
import { AuthRepositoryImpl } from '../data/repository/AuthRepositoryImpl';
import { LoginUseCase } from '../domain/usecase/LoginUseCase';
import { LogoutUseCase } from '../domain/usecase/LogoutUseCase';
import { GetCurrentUserUseCase } from '../domain/usecase/GetCurrentUserUseCase';

export function createAuthDependencies() {
	const datasource = new AuthRemoteDataSource(apiClient);
	const repository = new AuthRepositoryImpl(datasource);

	return {
		login: new LoginUseCase(repository),
		logout: new LogoutUseCase(repository),
		getCurrentUser: new GetCurrentUserUseCase(repository)
	};
}

export type AuthDependencies = ReturnType<typeof createAuthDependencies>;
