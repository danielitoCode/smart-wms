import { apiClient } from '../../../infrastructure/api/ApiClient';
import { WebhooksRemoteDataSource } from '../data/datasource/WebhooksRemoteDataSource';
import { WebhooksRepositoryImpl } from '../data/repository/WebhooksRepositoryImpl';
import { ListWebhooksUseCase, CreateWebhookUseCase, DeleteWebhookUseCase, RotateWebhookSecretUseCase } from '../domain/usecase/WebhooksUseCases';

export function createWebhooksDependencies() {
	const repository = new WebhooksRepositoryImpl(new WebhooksRemoteDataSource(apiClient));
	return {
		list: new ListWebhooksUseCase(repository),
		create: new CreateWebhookUseCase(repository),
		remove: new DeleteWebhookUseCase(repository),
		rotateSecret: new RotateWebhookSecretUseCase(repository)
	};
}
