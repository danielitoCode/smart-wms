import type {CreateVendor,UpdateVendor,Vendor,VendorId} from '../entity/Vendor';
export interface VendorRepository{
 getAllVendors(query?:{search?:string;active?:boolean|null}):Promise<Vendor[]>;
 getVendorById(vendorId:VendorId):Promise<Vendor>;
 deleteVendor(vendorId:VendorId):Promise<void>;
 saveVendor(vendor:CreateVendor):Promise<Vendor>;
 modifyVendor(vendorId:VendorId,vendor:UpdateVendor):Promise<Vendor>;
}