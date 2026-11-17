import type {DashboardPreferences,DashboardRange,LocalPickupPage,Productivity,ReceivedDashboard,ShippingHealth} from '../entity/Dashboard';
export interface DashboardRepository {
 productivity(warehouseId:number,range:DashboardRange):Promise<Productivity>;
 received(warehouseId:number,range:DashboardRange):Promise<ReceivedDashboard>;
 shippingHealth(warehouseId:number,range:DashboardRange):Promise<ShippingHealth>;
 preferences():Promise<DashboardPreferences>;
 updatePreferences(patch:Partial<DashboardPreferences>):Promise<DashboardPreferences>;
 localPickup(warehouseId:number,search:string,status:string):Promise<LocalPickupPage>;
 markPickedUp(orderId:number):Promise<void>;
}
