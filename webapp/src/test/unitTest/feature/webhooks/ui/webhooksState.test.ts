import {describe,it,expect,vi} from 'vitest';
import {ApiError} from '#core/infrastructure/errors/ApiError';
import {createWebhooksState} from '#core/feature/webhooks/ui/state/webhooksState.svelte';
const row={subscriptionId:'sid',connectorId:'erp',displayName:'ERP',deliveryUrl:'https://example.com',subscriptionFilter:{},status:'active',pauseReason:null,rateLimitPerSecond:50,pendingCeiling:100,dlqCeiling:20,lastDeliveredEventId:null,createdAt:null,updatedAt:null,stats:{attempts24h:0,succeeded24h:0,failed24h:0,dlq24h:0,successRate24h:null,pendingCount:0}} as const;
function deps(){return {list:{execute:vi.fn().mockResolvedValue([row])},listConnectors:{execute:vi.fn().mockResolvedValue([{connectorId:'erp',displayName:'ERP'}])},detail:{execute:vi.fn().mockResolvedValue(row)},create:{execute:vi.fn().mockResolvedValue({webhook:row,secret:{subscriptionId:'sid',secret:'one-time',secretGeneration:1}})},update:{execute:vi.fn().mockResolvedValue(row)},remove:{execute:vi.fn().mockResolvedValue({purged:false,status:'revoked'})},rotateSecret:{execute:vi.fn().mockResolvedValue({subscriptionId:'sid',secret:'rotated',secretGeneration:1})},getDlq:{execute:vi.fn().mockResolvedValue({deliveries:[],total:0,limit:50,offset:0})},getStats:{execute:vi.fn().mockResolvedValue({})},getErrors:{execute:vi.fn().mockResolvedValue({deliveries:[],total:0,errorKinds:[],limit:50,offset:0})},replayEvent:{execute:vi.fn().mockResolvedValue({})},replayBatch:{execute:vi.fn().mockResolvedValue({subscriptionId:'sid',impactCount:0,replayedCount:0,matchedWithEventData:0,matchedWithoutEventData:0})}};}
describe('Webhooks state',()=>{
 it('loads subscriptions and connector registry and keeps secret transient',async()=>{const d=deps();const vm=createWebhooksState(d as never);await vm.load();expect(vm.rows).toHaveLength(1);expect(vm.connectors[0].connectorId).toBe('erp');expect(await vm.create({connectorId:'erp',displayName:'ERP',deliveryUrl:'https://example.com',subscriptionFilter:{},rateLimitPerSecond:10,pendingCeiling:20,dlqCeiling:5})).toBe(true);expect(vm.secret?.secret).toBe('one-time');vm.clearSecret();expect(vm.secret).toBeNull();});
 it('surfaces URL tombstone conflict and supports explicit acknowledged retry',async()=>{const d=deps();d.create.execute.mockRejectedValueOnce(new ApiError(409,'url_reuse_tombstone','conflict',{error:'url_reuse_tombstone',tombstone_id:12,detail:'Acknowledge URL reuse'}));const vm=createWebhooksState(d as never);const input={connectorId:'erp',displayName:'ERP',deliveryUrl:'https://example.com',subscriptionFilter:{},rateLimitPerSecond:10,pendingCeiling:20,dlqCeiling:5};expect(await vm.create(input)).toBe(false);expect(vm.urlReuse?.tombstoneId).toBe(12);expect(await vm.createAcknowledged(input)).toBe(true);expect(d.create.execute).toHaveBeenLastCalledWith({...input,acknowledgeUrlReuse:true});});
 it('surfaces replay conflicts and supports single and batch replay',async()=>{const d=deps();d.replayBatch.execute.mockRejectedValueOnce(new ApiError(429,'replay_batch_throttled','api_error'));const vm=createWebhooksState(d as never);expect(await vm.replayMany('sid',{status:'dlq'})).toBeNull();expect(vm.error).toContain('replay_batch_throttled');expect(await vm.replayMany('sid',{status:'dlq'})).toMatchObject({replayedCount:0});expect(await vm.replayOne('sid',2)).toBe(true);});
 it('keeps webhook list usable when connector-registry permission is not granted',async()=>{const d=deps();d.listConnectors.execute.mockRejectedValueOnce(new ApiError(403,'Permission denied','forbidden'));const vm=createWebhooksState(d as never);await vm.load();expect(vm.rows).toHaveLength(1);expect(vm.connectors).toEqual([]);});

 it('clears a previously displayed one-time secret before a new create attempt, including failure',async()=>{
  const d=deps();const vm=createWebhooksState(d as never);
  await vm.create({connectorId:'erp',displayName:'ERP',deliveryUrl:'https://example.com',subscriptionFilter:{},rateLimitPerSecond:10,pendingCeiling:20,dlqCeiling:5});
  expect(vm.secret?.secret).toBe('one-time');
  d.create.execute.mockRejectedValueOnce(new ApiError(400,'Invalid webhook configuration','bad_request'));
  expect(await vm.create({connectorId:'erp',displayName:'ERP 2',deliveryUrl:'https://example.com/2',subscriptionFilter:{},rateLimitPerSecond:10,pendingCeiling:20,dlqCeiling:5})).toBe(false);
  expect(vm.secret).toBeNull();
 });
 it('never leaves an old plaintext secret visible when rotation fails',async()=>{
  const d=deps();const vm=createWebhooksState(d as never);
  await vm.create({connectorId:'erp',displayName:'ERP',deliveryUrl:'https://example.com',subscriptionFilter:{},rateLimitPerSecond:10,pendingCeiling:20,dlqCeiling:5});
  d.rotateSecret.execute.mockRejectedValueOnce(new ApiError(403,'Forbidden','forbidden'));
  expect(await vm.rotate('sid')).toBe(false);
  expect(vm.secret).toBeNull();
  expect(vm.error).toBe('Forbidden');
 });
 it('passes the large-replay acknowledgement only when explicitly requested',async()=>{
  const d=deps();const vm=createWebhooksState(d as never);
  await vm.replayMany('sid',{status:'failed'},false);
  expect(d.replayBatch.execute).toHaveBeenLastCalledWith('sid',{status:'failed'},false);
  await vm.replayMany('sid',{status:'dlq',warehouseId:7},true);
  expect(d.replayBatch.execute).toHaveBeenLastCalledWith('sid',{status:'dlq',warehouseId:7},true);
 });

});
