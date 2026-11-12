import type {UpdateVendor} from '../entity/Vendor';
import type {VendorRepository} from '../repository/VendorRepository';
export class ModifyVendorUseCase{constructor(private readonly repository:VendorRepository){}execute(id:string,v:UpdateVendor){return this.repository.modifyVendor(id,v);}}