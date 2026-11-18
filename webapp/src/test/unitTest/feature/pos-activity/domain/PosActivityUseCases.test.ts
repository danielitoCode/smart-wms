import { describe,expect,it,vi } from 'vitest';
import { FilterPosActivityUseCase,GetPosActivitySummaryUseCase,ListPosActivityUseCase } from '#core/feature/pos-activity/domain/usecase/PosActivityUseCases';
describe('POS Activity use cases',()=>{
	it('list and filter pass the query to repository',async()=>{const list=vi.fn().mockResolvedValue({salesOrders:[],total:0,page:1,perPage:50,pages:1});const repo={list,summary:vi.fn()};const query={date:'2026-11-17',orderType:'all' as const,cashierId:'cashier-1',page:3};await new ListPosActivityUseCase(repo).execute(query);await new FilterPosActivityUseCase(repo).execute(query);expect(list).toHaveBeenNthCalledWith(1,query);expect(list).toHaveBeenNthCalledWith(2,query);});
	it('summary uses the selected store date',async()=>{const summary=vi.fn().mockResolvedValue({});const repo={list:vi.fn(),summary};await new GetPosActivitySummaryUseCase(repo).execute('2026-11-17');expect(summary).toHaveBeenCalledWith('2026-11-17');});
});
