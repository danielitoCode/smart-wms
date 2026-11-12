import type {CreateVendor,UpdateVendor,Vendor} from '../entity/Vendor';
export interface VendorRepository{
 getAllVendors(query?:{search?:string;active?:boolean|null}):Promise<Vendor[]>;
 getVendorById(vendorId:string):Promise<Vendor>;
 deleteVendor(vendorId:string):Promise<void>;
 saveVendor(vendor:CreateVendor):Promise<Vendor>;
 modifyVendor(vendorId:string,vendor:UpdateVendor):Promise<Vendor>;
}