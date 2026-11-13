import { apiClient } from '../../../infrastructure/api/ApiClient';
import { NotificationsRemoteDataSource } from '../data/datasource/NotificationsRemoteDataSource';
import { NotificationsRepositoryImpl } from '../data/repository/NotificationsRepositoryImpl';
import {
	ListNotificationWebhooksUseCase,
	CreateNotificationWebhookUseCase,
	DeleteNotificationWebhookUseCase,
	TestNotificationWebhookUseCase
} from '../domain/usecase/NotificationsUseCases';

export function createNotificationsDependencies() {
	const repository = new NotificationsRepositoryImpl(new NotificationsRemoteDataSource(apiClient));
	return {
		list: new ListNotificationWebhooksUseCase(repository),
		create: new CreateNotificationWebhookUseCase(repository),
		remove: new DeleteNotificationWebhookUseCase(repository),
		testSend: new TestNotificationWebhookUseCase(repository)
	};
}
