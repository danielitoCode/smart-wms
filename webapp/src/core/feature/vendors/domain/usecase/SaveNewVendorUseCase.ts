import type {VendorRepository} from '../repository/VendorRepository';
import type {CreateVendor,Vendor} from '../entity/Vendor';
export class SaveNewVendorUseCase{constructor(private readonly repository:VendorRepository){}execute(v:CreateVendor):Promise<Vendor>{if(!v.vendorName.trim())throw new Error('El nombre del proveedor es obligatorio');return this.repository.saveVendor(v);}}