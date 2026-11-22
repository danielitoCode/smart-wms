import {describe,it,expect,vi} from 'vitest';
import type {ApiClient} from '#core/infrastructure/api/ApiClient';
import {WebhooksRemoteDataSource} from '#core/feature/webhooks/data/datasource/WebhooksRemoteDataSource';
import {WebhookMapper} from '#core/feature/webhooks/data/mapper/WebhookMapper';
import {WebhooksRepositoryImpl} from '#core/feature/webhooks/data/repository/WebhooksRepositoryImpl';
const row={subscription_id:'sid',connector_id:'erp',display_name:'ERP',delivery_url:'https://example.com/hook',subscription_filter:{event_types:['order.created'],warehouse_ids:[3]},status:'paused' as const,pause_reason:'manual',rate_limit_per_second:20,pending_ceiling:1000,dlq_ceiling:100,last_delivered_event_id:10,created_at:null,updated_at:null,stats:{attempts_24h:10,succeeded_24h:8,failed_24h:1,dlq_24h:1,success_rate_24h:.8,pending_count:2}};
describe('Webhooks Flask data contracts',()=>{
 it('maps exact subscription fields and 24h stats',()=>{expect(WebhookMapper.toDomain(row)).toMatchObject({subscriptionId:'sid',connectorId:'erp',displayName:'ERP',status:'paused',pauseReason:'manual',subscriptionFilter:{eventTypes:['order.created'],warehouseIds:[3]},stats:{attempts24h:10,successRate24h:.8,pendingCount:2}});});
 it('maps DLQ event context, stats and catalog-enriched errors',()=>{const d=WebhookMapper.toDelivery({delivery_id:4,event_id:8,attempt_number:3,http_status:500,error_kind:'5xx',error_detail:'failed',attempted_at:null,completed_at:null,scheduled_at:null,secret_generation:1,event:{event_type:'order.created',event_timestamp:null,aggregate_external_id:null,warehouse_id:2,source_txn_id:'tx'}});expect(d).toMatchObject({deliveryId:4,status:'dlq',event:{eventType:'order.created',warehouseId:2}});const s=WebhookMapper.toStats({subscription_id:'sid',window:'24h',generated_at:1,attempts_total:5,succeeded:2,failed:1,dlq:2,in_flight:0,pending:0,success_rate:.4,response_time_ms:{p50:1,p95:2,p99:3},top_error_kinds:[{kind:'5xx',count:2}],current_lag:7});expect(s).toMatchObject({attemptsTotal:5,currentLag:7,responseTimeMs:{p95:2}});});
 it('uses exact list/detail/CRUD/rotate/DLQ/stats/errors/replay paths',async()=>{const get=vi.fn().mockResolvedValueOnce({webhooks:[]}).mockResolvedValueOnce(row).mockResolvedValueOnce({subscription_id:'sid',deliveries:[],total:0,limit:50,offset:0}).mockResolvedValueOnce({subscription_id:'sid',window:'24h',generated_at:1,attempts_total:0,succeeded:0,failed:0,dlq:0,in_flight:0,pending:0,success_rate:null,response_time_ms:{p50:null,p95:null,p99:null},top_error_kinds:[],current_lag:0}).mockResolvedValueOnce({deliveries:[],total:0,limit:50,offset:0,error_kinds:[]});
 const post=vi.fn().mockResolvedValueOnce({subscription_id:'sid',secret:'once',secret_generation:1}).mockResolvedValueOnce({subscription_id:'sid',secret:'rotated',secret_generation:1}).mockResolvedValueOnce({subscription_id:'sid',original_delivery_id:2,replayed_delivery_id:9}).mockResolvedValueOnce({subscription_id:'sid',impact_count:0,replayed_count:0,matched_with_event_data:0,matched_without_event_data:0});
 const patch=vi.fn().mockResolvedValue(row);const del=vi.fn().mockResolvedValue({subscription_id:'sid',purged:false,status:'revoked'});
 const api={get,post,patch,delete:del} as unknown as ApiClient;const remote=new WebhooksRemoteDataSource(api);
 await remote.list();await remote.detail('sid');await remote.dlq('sid',50,0);await remote.stats('sid','24h');await remote.errors({limit:50,offset:0});await remote.create({});await remote.update('sid',{});await remote.rotateSecret('sid');await remote.replayEvent('sid',2);await remote.replayBatch('sid',{status:'dlq'},false);await remote.remove('sid');
 expect(get.mock.calls.map(x=>x[0])).toEqual(['/api/admin/webhooks','/api/admin/webhooks/sid','/api/admin/webhooks/sid/dlq?limit=50&offset=0','/api/admin/webhooks/sid/stats?window=24h','/api/admin/webhook-errors?limit=50&offset=0']);
 expect(post.mock.calls.map(x=>x[0])).toEqual(['/api/admin/webhooks','/api/admin/webhooks/sid/rotate-secret','/api/admin/webhooks/sid/replay/2','/api/admin/webhooks/sid/replay-batch']);
 expect(patch).toHaveBeenCalledWith('/api/admin/webhooks/sid',{});expect(del).toHaveBeenCalledWith('/api/admin/webhooks/sid');
 });
 it('does not leak a secret through list/detail mapping',()=>{expect(WebhookMapper.toDomain(row)).not.toHaveProperty('secret');});

 it('serializes webhook error filters and bounded DLQ pagination into the Flask query contract',async()=>{
  const get=vi.fn().mockResolvedValueOnce({deliveries:[],total:0,limit:25,offset:50,error_kinds:[]})
   .mockResolvedValueOnce({subscription_id:'sid',deliveries:[],total:0,limit:100,offset:200});
  const source=new WebhooksRemoteDataSource({get} as unknown as ApiClient);
  await source.errors({limit:25,offset:50,subscriptionId:'sub/1',errorKind:'5xx',from:'2026-11-01T00:00:00Z',to:'2026-11-02T00:00:00Z'});
  await source.dlq('sid',100,200);
  const errorsUrl=new URL(get.mock.calls[0][0],'https://example.test');
  expect(errorsUrl.pathname).toBe('/api/admin/webhook-errors');
  expect(Object.fromEntries(errorsUrl.searchParams.entries())).toEqual({
   limit:'25',offset:'50',subscription_id:'sub/1',error_kind:'5xx',
   from:'2026-11-01T00:00:00Z',to:'2026-11-02T00:00:00Z'
  });
  expect(get.mock.calls[1][0]).toBe('/api/admin/webhooks/sid/dlq?limit=100&offset=200');
 });
});
