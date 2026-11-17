import { apiClient } from '../../../infrastructure/api/ApiClient';
import { SettingsRemoteDataSource } from '../data/datasource/SettingsRemoteDataSource';
import { SettingsRepositoryImpl } from '../data/repository/SettingsRepositoryImpl';
import {
	GetSettingUseCase,
	GetSettingsUseCase,
	UpdateSettingsUseCase
} from '../domain/usecase/SettingsUseCases';

export function createSettingsDependencies() {
	const repository = new SettingsRepositoryImpl(new SettingsRemoteDataSource(apiClient));
	return {
		getSettings: new GetSettingsUseCase(repository),
		getSetting: new GetSettingUseCase(repository),
		update: new UpdateSettingsUseCase(repository)
	};
}
