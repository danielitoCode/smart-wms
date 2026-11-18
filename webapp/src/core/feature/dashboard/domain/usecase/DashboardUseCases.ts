import type {DashboardRepository} from '../repository/DashboardRepository';
import type {DashboardRange} from '../entity/Dashboard';
export class GetProductivityUseCase { constructor(private r:DashboardRepository){} execute(w:number,d:DashboardRange){return this.r.productivity(w,d);} }
export class GetReceivedTodayUseCase { constructor(private r:DashboardRepository){} execute(w:number,d:DashboardRange){return this.r.received(w,d);} }
export class GetShippingHealthUseCase { constructor(private r:DashboardRepository){} execute(w:number,d:DashboardRange){return this.r.shippingHealth(w,d);} }
export class GetPreferencesUseCase { constructor(private r:DashboardRepository){} execute(){return this.r.preferences();} }
export class UpdatePreferencesUseCase { constructor(private r:DashboardRepository){} execute(p:Parameters<DashboardRepository['updatePreferences']>[0]){return this.r.updatePreferences(p);} }
export class GetLocalPickupUseCase { constructor(private r:DashboardRepository){} execute(w:number,q:string,s:string){return this.r.localPickup(w,q,s);} }
export class MarkLocalPickupUseCase { constructor(private r:DashboardRepository){} execute(id:number){return this.r.markPickedUp(id);} }
export class UpdateLocalPickupUseCase { constructor(private r:DashboardRepository){} execute(id:number,p:Parameters<DashboardRepository['updateLocalPickup']>[1]){return this.r.updateLocalPickup(id,p);} }
