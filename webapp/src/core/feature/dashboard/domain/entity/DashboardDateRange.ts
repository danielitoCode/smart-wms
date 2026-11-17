import type {DashboardRange,DashboardRangeKey} from './Dashboard';
function localIso(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');}
export function dashboardRangeForPreset(key:DashboardRangeKey,customStart:string,customEnd:string,now=new Date()):DashboardRange|null{
 const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
 if(key==='today')return {start:localIso(today),end:localIso(today)};
 if(key==='yesterday'){const d=new Date(today);d.setDate(d.getDate()-1);return {start:localIso(d),end:localIso(d)};}
 if(key==='last_7d'||key==='last_30d'){const d=new Date(today);d.setDate(d.getDate()-(key==='last_7d'?6:29));return {start:localIso(d),end:localIso(today)};}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(customStart)||!/^\d{4}-\d{2}-\d{2}$/.test(customEnd)||customEnd<customStart)return null;
 return {start:customStart,end:customEnd};
}
