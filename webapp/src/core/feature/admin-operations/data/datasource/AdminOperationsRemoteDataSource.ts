import type {ApiClient} from '../../../../infrastructure/api/ApiClient';
import type {AdminOperationKey,AdminOperationQuery,AdminOperationResult} from '../../domain/AdminOperation';
import type {AdminOperationListDto} from '../dto/AdminOperationDto';
const defs:Record<AdminOperationKey,{path:string;key:string;warehouse?:boolean}>={backorders:{path:'/api/admin/backorders',key:'backorders',warehouse:true},'count-approvals':{path:'/api/admin/adjustments/pending',key:'adjustments'},fraud:{path:'/api/admin/sales-orders',key:'sales_orders'},'inter-warehouse-transfers':{path:'/api/admin/inter-warehouse-transfers',key:'transfers'},adjustments:{path:'/api/admin/adjustments/list',key:'adjustments',warehouse:true},'pos-activity':{path:'/api/admin/pos/sales-orders',key:'sales_orders'},'preferred-bins':{path:'/api/admin/preferred-bins',key:'preferred_bins',warehouse:true},'purchase-orders':{path:'/api/admin/purchase-orders',key:'purchase_orders',warehouse:true},refunds:{path:'/api/admin/sales-orders',key:'sales_orders'},returns:{path:'/api/admin/sales-orders',key:'sales_orders'},'transfer-orders':{path:'/api/admin/transfer-orders',key:'transfer_orders'},users:{path:'/api/admin/users',key:'users'},vendors:{path:'/api/admin/vendors',key:'vendors'}};
const rec=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'?v as Record<string,unknown>:{};
export class AdminOperationsRemoteDataSource{
 constructor(private readonly api:ApiClient){}
 async list(feature:AdminOperationKey,q:AdminOperationQuery={}):Promise<AdminOperationResult>{
  const d=defs[feature],p=new URLSearchParams();if(d.warehouse&&q.warehouseId!=null)p.set('warehouse_id',String(q.warehouseId));if(q.search?.trim())p.set('q',q.search.trim());p.set('per_page','200');
  if(feature==='backorders')p.set('tab',q.tab??'waiting');if(feature==='fraud')p.set('status','FRAUD_REVIEW');if(feature==='refunds')p.set('order_type','refund');if(feature==='returns')p.set('order_type','return');
  if(feature==='pos-activity'){p.set('date',q.date??new Date().toISOString().slice(0,10));p.set('order_type','all');if(q.status)p.set('status',q.status);}
  const body=rec(await this.api.get<AdminOperationListDto>(d.path+'?'+p.toString()));const data=body[d.key];const rows=Array.isArray(data)?data.map(rec):[];let summary:Record<string,unknown>|null=null;
  if(feature==='pos-activity'){const date=q.date??new Date().toISOString().slice(0,10);summary=rec(await this.api.get<unknown>('/api/admin/pos/summary?date='+encodeURIComponent(date)));}
  return {rows,summary,total:typeof body.total==='number'?body.total:null};
 }
}
