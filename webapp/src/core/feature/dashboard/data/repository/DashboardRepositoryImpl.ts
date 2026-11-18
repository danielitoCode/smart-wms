import type {DashboardPreferences,DashboardRange} from '../../domain/entity/Dashboard';
import type {DashboardRepository} from '../../domain/repository/DashboardRepository';
import type {DashboardRemoteDataSource} from '../datasource/DashboardRemoteDataSource';
import {DashboardMapper as M} from '../mapper/DashboardMapper';
export class DashboardRepositoryImpl implements DashboardRepository {
 constructor(private remote:DashboardRemoteDataSource){}
 async productivity(w:number,r:DashboardRange){return M.productivity(await this.remote.productivity(w,r));}
 async received(w:number,r:DashboardRange){return M.received(await this.remote.received(w,r));}
 async shippingHealth(w:number,r:DashboardRange){return M.shipping(await this.remote.shippingHealth(w,r));}
 async preferences(){return M.preferences(await this.remote.preferences());}
 async updatePreferences(p:Partial<DashboardPreferences>){return M.preferences(await this.remote.updatePreferences(p));}
 async localPickup(w:number,q:string,s:string){return M.localPickup(await this.remote.localPickup(w,q,s));}
 async markPickedUp(id:number){await this.remote.markPickedUp(id);}
 async updateLocalPickup(id:number,p:{customer_name:string|null;customer_phone:string|null;ship_method:string|null;ship_address:string|null;priority:number;memo:string|null}){await this.remote.updateLocalPickup(id,p);}
}
