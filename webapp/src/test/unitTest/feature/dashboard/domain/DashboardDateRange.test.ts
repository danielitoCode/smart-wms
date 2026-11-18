import {describe,it,expect} from 'vitest';
import {dashboardRangeForPreset} from '#core/feature/dashboard/domain/entity/DashboardDateRange';
describe('dashboard local calendar date ranges',()=>{
 const now=new Date(2026,10,17,23,45,0);
 it('keeps Today in local calendar time near UTC date rollover',()=>{expect(dashboardRangeForPreset('today','','',now)).toEqual({start:'2026-11-17',end:'2026-11-17'});});
 it('uses inclusive Yesterday, Last 7d and Last 30d windows',()=>{expect(dashboardRangeForPreset('yesterday','','',now)).toEqual({start:'2026-11-16',end:'2026-11-16'});expect(dashboardRangeForPreset('last_7d','','',now)).toEqual({start:'2026-11-11',end:'2026-11-17'});expect(dashboardRangeForPreset('last_30d','','',now)).toEqual({start:'2026-10-19',end:'2026-11-17'});});
 it('rejects incomplete and reversed custom ranges',()=>{expect(dashboardRangeForPreset('custom','2026-11-01','',now)).toBeNull();expect(dashboardRangeForPreset('custom','2026-11-02','2026-11-01',now)).toBeNull();});
 it('accepts inclusive custom ranges',()=>{expect(dashboardRangeForPreset('custom','2026-11-01','2026-11-17',now)).toEqual({start:'2026-11-01',end:'2026-11-17'});});
});
