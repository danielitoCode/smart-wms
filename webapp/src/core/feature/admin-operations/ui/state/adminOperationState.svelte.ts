import {createAdminOperationsDependencies} from '../../di/adminOperations.dependencies';
import type {AdminOperationKey,AdminOperationQuery,AdminOperationResult} from '../../domain/entity/AdminOperation.ts';
import {toUserMessage} from '../../../../infrastructure/errors/ApiError';
const deps=createAdminOperationsDependencies();
export function createAdminOperationState(feature:AdminOperationKey){
 let result=$state<AdminOperationResult>({rows:[],summary:null,total:null}),loading=$state(false),error=$state<string|null>(null),search=$state(''),tab=$state('waiting'),date=$state(new Date().toISOString().slice(0,10)),status=$state('');
 async function load(extra:Partial<AdminOperationQuery>={}){if(loading)return false;loading=true;error=null;try{result=await deps.list.execute(feature,{search,tab,date,status,...extra});return true;}catch(e){error=toUserMessage(e,'No se pudieron cargar los datos del módulo');result={rows:[],summary:null,total:null};return false;}finally{loading=false;}}
 return {get rows(){return result.rows;},get summary(){return result.summary;},get total(){return result.total;},get loading(){return loading;},get error(){return error;},get search(){return search;},get tab(){return tab;},get date(){return date;},get status(){return status;},setSearch(v:string){search=v;},setTab(v:string){tab=v;},setDate(v:string){date=v;},setStatus(v:string){status=v;},load};
}
