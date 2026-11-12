import type {VendorRepository} from '../repository/VendorRepository';
import type {Vendor} from '../entity/Vendor';
export class GetAllVendorsUseCase{constructor(private readonly repository:VendorRepository){}execute(query?:{search?:string;active?:boolean|null}):Promise<Vendor[]>{return this.repository.getAllVendors(query);}}