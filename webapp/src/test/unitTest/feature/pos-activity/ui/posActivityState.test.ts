import { beforeEach,describe,expect,it,vi } from 'vitest';
const deps=vi.hoisted(()=>({list:{execute:vi.fn()},filter:{execute:vi.fn()},summary:{execute:vi.fn()}}));
vi.mock('#core/feature/pos-activity/di/posActivity.dependencies',()=>({createPosActivityDependencies:()=>deps}));
import { createPosActivityState } from '#core/feature/pos-activity/ui/state/posActivityState.svelte';
describe('POS Activity state',()=>{
	beforeEach(()=>{vi.clearAllMocks();deps.list.execute.mockResolvedValue({salesOrders:[],total:0,page:1,perPage:50,pages:1});deps.filter.execute.mockResolvedValue({salesOrders:[],total:0,page:1,perPage:50,pages:1});deps.summary.execute.mockResolvedValue({date:'2026-11-17'});});
	it('passes filters and pagination to the filter use case',async()=>{const state=createPosActivityState();state.set('cashierId','cashier-2');state.set('date','2026-11-17');state.setPage(3);await state.loadList();expect(deps.filter.execute).toHaveBeenCalledWith(expect.objectContaining({cashierId:'cashier-2',date:'2026-11-17',page:3}));});
	it('keeps list data when summary request fails',async()=>{deps.summary.execute.mockRejectedValue(new Error('summary failed'));const state=createPosActivityState();await state.load();expect(state.page.total).toBe(0);expect(state.listError).toBeNull();expect(state.summaryError).toBeTruthy();});
	it('reports list failure separately',async()=>{deps.filter.execute.mockRejectedValue(new Error('denied'));const state=createPosActivityState();await state.loadList();expect(state.listError).toBeTruthy();});
});
