import type {Productivity} from './Dashboard';
const TITLES:Record<string,string>={picking:'Picking',packing:'Packing',shipped:'Shipped',received_skus:'Received',putaway_skus:'Put Away'};
function csvCell(value:unknown){const raw=String(value??'');return '"'+raw.replace(/"/g,'""')+'"';}
export function buildProductivityCsv(payload:Productivity):string{
 const events=payload.eventsVisible,rows:string[][]=[['User',...events.map(e=>TITLES[e]??e),'Total']];
 for(const user of payload.users)rows.push([user.displayName||user.username,...events.map(e=>String(user.metrics[e]??0)),String(user.total??0)]);
 return rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
