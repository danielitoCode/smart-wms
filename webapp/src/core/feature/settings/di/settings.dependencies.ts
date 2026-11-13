import { apiClient } from '../../../infrastructure/api/ApiClient';
import { SettingsRemoteDataSource } from '../data/datasource/SettingsRemoteDataSource';
import { SettingsRepositoryImpl } from '../data/repository/SettingsRepositoryImpl';
import { ListKnownSettingsUseCase, UpdateSettingsUseCase } from '../domain/usecase/SettingsUseCases';

export function createSettingsDependencies() {
	const repository = new SettingsRepositoryImpl(new SettingsRemoteDataSource(apiClient));
	return {
		listKnown: new ListKnownSettingsUseCase(repository),
		update: new UpdateSettingsUseCase(repository)
	};
}
