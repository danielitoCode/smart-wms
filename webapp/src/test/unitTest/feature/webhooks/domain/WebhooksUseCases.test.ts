import {describe,it,expect,vi} from 'vitest';
import type {WebhooksRepository} from '#core/feature/webhooks/domain/repository/WebhooksRepository';
import {CreateWebhookUseCase,UpdateWebhookUseCase,ReplayWebhookBatchUseCase,GetWebhookDLQUseCase} from '#core/feature/webhooks/domain/usecase/WebhooksUseCases';
const r={create:vi.fn(),update:vi.fn(),replayBatch:vi.fn(),getDlq:vi.fn()} as unknown as WebhooksRepository;
const base={connectorId:'erp',displayName:'ERP hook',deliveryUrl:'https://example.com/hook',subscriptionFilter:{eventTypes:['order.created']},rateLimitPerSecond:50,pendingCeiling:1000,dlqCeiling:100};
describe('Webhooks domain contracts',()=>{
 it('validates create fields and accepts only HTTP(S) URLs',()=>{const use=new CreateWebhookUseCase(r);expect(()=>use.execute({...base,displayName:' '})).toThrow();expect(()=>use.execute({...base,deliveryUrl:'ftp://example.com'})).toThrow();expect(()=>use.execute({...base,rateLimitPerSecond:101})).toThrow();expect(()=>use.execute({...base,subscriptionFilter:{eventTypes:[]}})).toThrow();});
 it('does not allow revoked or arbitrary status through PATCH',()=>{const use=new UpdateWebhookUseCase(r);expect(()=>use.execute({subscriptionId:'id',status:'revoked' as never})).toThrow();expect(()=>use.execute({subscriptionId:'id',status:'running' as never})).toThrow();});
 it('rejects empty filters and malformed warehouse/UUID values',()=>{const use=new UpdateWebhookUseCase(r);expect(()=>use.execute({subscriptionId:'id',subscriptionFilter:{warehouseIds:[0]}})).toThrow();expect(()=>use.execute({subscriptionId:'id',subscriptionFilter:{aggregateExternalIdAllowlist:['bad']}})).toThrow();});
 it('accepts only the three backend replay statuses and valid date ranges',()=>{const use=new ReplayWebhookBatchUseCase(r);expect(()=>use.execute('id',{status:'active' as never})).toThrow();expect(()=>use.execute('id',{status:'dlq',completedAtFrom:'2026-02-02',completedAtTo:'2026-01-01'})).toThrow();});
 it('enforces DLQ pagination bounds',()=>{const use=new GetWebhookDLQUseCase(r);expect(()=>use.execute('id',501,0)).toThrow();expect(()=>use.execute('id',50,-1)).toThrow();});
});
