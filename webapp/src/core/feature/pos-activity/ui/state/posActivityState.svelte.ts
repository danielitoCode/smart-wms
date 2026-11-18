import { createPosActivityDependencies } from '../../di/posActivity.dependencies';
import type { PosActivityPage, PosActivityQuery, PosActivitySummary } from '../../domain/entity/PosActivity';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';
const d=createPosActivityDependencies();
function storeDate(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
export function createPosActivityState(){
	let page=$state<PosActivityPage>({salesOrders:[],total:0,page:1,perPage:50,pages:1});
	let summary=$state<PosActivitySummary|null>(null),loading=$state(false),summaryLoading=$state(false);
	let listError=$state<string|null>(null),summaryError=$state<string|null>(null),selected=$state<PosActivity|null>(null);
	let query=$state<PosActivityQuery>({page:1,perPage:50,orderType:'sale',date:storeDate()});
	let listRequest=0,summaryRequest=0;
	async function loadList(){const request=++listRequest;loading=true;listError=null;try{const result=await d.list.execute({...query});if(request===listRequest)page=result;}catch(e){if(request===listRequest)listError=toUserMessage(e,'No se pudo cargar la actividad POS');}finally{if(request===listRequest)loading=false;}}
	async function loadSummary(){const request=++summaryRequest;summaryLoading=true;summaryError=null;try{const result=await d.summary.execute(query.date??storeDate());if(request===summaryRequest)summary=result;}catch(e){if(request===summaryRequest)summaryError=toUserMessage(e,'No se pudo cargar el resumen POS');}finally{if(request===summaryRequest)summaryLoading=false;}}
	async function load(){await Promise.all([loadList(),loadSummary()]);}
	function set<K extends keyof PosActivityQuery>(key:K,value:PosActivityQuery[K]){query={...query,[key]:value,page:1};}
	function setPage(v:number){query={...query,page:v};}
	return {get page(){return page;},get summary(){return summary;},get loading(){return loading;},get summaryLoading(){return summaryLoading;},get listError(){return listError;},get summaryError(){return summaryError;},get query(){return query;},get selected(){return selected;},set,setPage,select(row:PosActivity|null){selected=row;},load,loadList,loadSummary};
}
import type { PosActivity } from '../../domain/entity/PosActivity';
