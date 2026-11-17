import type {ApiClient} from '../../../../infrastructure/api/ApiClient';
import type {DashboardRange,DashboardPreferences} from '../../domain/entity/Dashboard';
import type {PreferencesDto,ProductivityDto,ReceivedDto,ShippingHealthDto,LocalPickupDto} from '../dto/DashboardDto';
export class DashboardRemoteDataSource {
 constructor(private api:ApiClient){}
 private query(w:number,r:DashboardRange){return new URLSearchParams({warehouse_id:String(w),start:r.start,end:r.end}).toString();}
 productivity(w:number,r:DashboardRange){return this.api.get<ProductivityDto>('/api/v1/dashboard/productivity?'+this.query(w,r));}
 received(w:number,r:DashboardRange){return this.api.get<ReceivedDto>('/api/v1/dashboard/received?'+this.query(w,r));}
 shippingHealth(w:number,r:DashboardRange){return this.api.get<ShippingHealthDto>('/api/v1/dashboard/shipping-health?'+this.query(w,r));}
 preferences(){return this.api.get<PreferencesDto>('/api/v1/dashboard/preferences');}
 updatePreferences(p:Partial<DashboardPreferences>){const body:{chart_order?:string[];default_range?:string;default_view?:string}={};if(p.chartOrder!==undefined)body.chart_order=p.chartOrder;if(p.defaultRange!==undefined)body.default_range=p.defaultRange;if(p.defaultView!==undefined)body.default_view=p.defaultView;return this.api.put<PreferencesDto>('/api/v1/dashboard/preferences',body);}
 localPickup(w:number,q:string,s:string){const p=new URLSearchParams({warehouse_id:String(w),local_pickup:'true',per_page:'1000'});if(q.trim())p.set('q',q.trim());if(s!=='All')p.set('status',s);return this.api.get<LocalPickupDto>('/api/admin/sales-orders?'+p);}
 async markPickedUp(id:number){await this.api.put('/api/admin/sales-orders/'+id,{status:'SHIPPED'});}
}
