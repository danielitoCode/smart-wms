import {describe,it,expect,vi} from 'vitest';
import type {ApiClient} from '#core/infrastructure/api/ApiClient';
import {DashboardRemoteDataSource} from '#core/feature/dashboard/data/datasource/DashboardRemoteDataSource';
describe('DashboardRemoteDataSource Flask endpoints',()=>{
 const range={start:'2026-11-11',end:'2026-11-17'};
 it('passes warehouse and inclusive dates to productivity, received and shipping health',async()=>{
  const get=vi.fn().mockResolvedValue({});const api={get,put:vi.fn()} as unknown as ApiClient;const ds=new DashboardRemoteDataSource(api);
  await ds.productivity(7,range);await ds.received(7,range);await ds.shippingHealth(7,range);
  expect(get).toHaveBeenNthCalledWith(1,'/api/v1/dashboard/productivity?warehouse_id=7&start=2026-11-11&end=2026-11-17');
  expect(get).toHaveBeenNthCalledWith(2,'/api/v1/dashboard/received?warehouse_id=7&start=2026-11-11&end=2026-11-17');
  expect(get).toHaveBeenNthCalledWith(3,'/api/v1/dashboard/shipping-health?warehouse_id=7&start=2026-11-11&end=2026-11-17');
 });
 it('loads and updates preferences without accepting a client user id',async()=>{
  const get=vi.fn().mockResolvedValue({}),put=vi.fn().mockResolvedValue({});const ds=new DashboardRemoteDataSource({get,put} as unknown as ApiClient);
  await ds.preferences();await ds.updatePreferences({defaultRange:'last_7d',defaultView:'table',chartOrder:['shipped','picking']});
  expect(get).toHaveBeenCalledWith('/api/v1/dashboard/preferences');
  expect(put).toHaveBeenCalledWith('/api/v1/dashboard/preferences',{chart_order:['shipped','picking'],default_range:'last_7d',default_view:'table'});
 });
 it('uses the real warehouse-scoped local pickup filter and existing sales-order update endpoint',async()=>{
  const get=vi.fn().mockResolvedValue({}),put=vi.fn().mockResolvedValue({});const ds=new DashboardRemoteDataSource({get,put} as unknown as ApiClient);
  await ds.localPickup(9,'Alice','OPEN,PICKED');await ds.markPickedUp(44);
  expect(get).toHaveBeenCalledWith('/api/admin/sales-orders?warehouse_id=9&local_pickup=true&per_page=1000&q=Alice&status=OPEN%2CPICKED');
  expect(put).toHaveBeenCalledWith('/api/admin/sales-orders/44',{status:'SHIPPED'});
 });
});
