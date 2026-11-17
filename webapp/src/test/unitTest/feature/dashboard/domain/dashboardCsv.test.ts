import {describe,it,expect} from 'vitest';
import {buildProductivityCsv} from '#core/feature/dashboard/domain/entity/dashboardCsv';
describe('productivity CSV export',()=>{
 it('exports visible event columns and zeroes for partial metrics',()=>{const csv=buildProductivityCsv({warehouseId:1,range:{start:'2026-11-17',end:'2026-11-17'},eventsVisible:['picking','shipped'],users:[{userId:1,username:'alice',displayName:'Alice',metrics:{picking:2},total:2}],totalsPerEvent:{picking:2}});expect(csv).toBe('"User","Picking","Shipped","Total"\r\n"Alice","2","0","2"');});
 it('escapes quotes and commas in user names',()=>{const csv=buildProductivityCsv({warehouseId:1,range:{start:'2026-11-17',end:'2026-11-17'},eventsVisible:[],users:[{userId:1,username:'a',displayName:'Smith, "A"',metrics:{},total:0}],totalsPerEvent:{},totalOrders:0,totalPicks:0,totalUnits:0,warnings:[]});expect(csv).toContain('"Smith, ""A"""');});
});
