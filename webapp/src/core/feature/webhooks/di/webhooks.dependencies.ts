import {apiClient} from '../../../infrastructure/api/ApiClient';
import {WebhooksRemoteDataSource} from '../data/datasource/WebhooksRemoteDataSource';
import {WebhooksRepositoryImpl} from '../data/repository/WebhooksRepositoryImpl';
import {ListWebhooksUseCase,ListWebhookConnectorsUseCase,GetWebhookUseCase,CreateWebhookUseCase,UpdateWebhookUseCase,DeleteWebhookUseCase,RotateWebhookSecretUseCase,GetWebhookDLQUseCase,GetWebhookStatsUseCase,GetWebhookErrorsUseCase,ReplayWebhookEventUseCase,ReplayWebhookBatchUseCase} from '../domain/usecase/WebhooksUseCases';
export function createWebhooksDependencies(){const r=new WebhooksRepositoryImpl(new WebhooksRemoteDataSource(apiClient));return {
 list:new ListWebhooksUseCase(r),listConnectors:new ListWebhookConnectorsUseCase(r),detail:new GetWebhookUseCase(r),create:new CreateWebhookUseCase(r),
 update:new UpdateWebhookUseCase(r),remove:new DeleteWebhookUseCase(r),rotateSecret:new RotateWebhookSecretUseCase(r),getDlq:new GetWebhookDLQUseCase(r),
 getStats:new GetWebhookStatsUseCase(r),getErrors:new GetWebhookErrorsUseCase(r),replayEvent:new ReplayWebhookEventUseCase(r),replayBatch:new ReplayWebhookBatchUseCase(r)
};}
