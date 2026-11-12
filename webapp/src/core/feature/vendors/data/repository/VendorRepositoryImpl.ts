import type {CreateVendor,UpdateVendor,Vendor} from '../../domain/entity/Vendor';
import type {VendorRepository} from '../../domain/repository/VendorRepository';
import type {VendorRemoteDataSource} from '../datasource/VendorRemoteDataSource';
import {VendorMapper} from '../mapper/VendorMapper';
export class VendorRepositoryImpl implements VendorRepository{
 constructor(private readonly remote:VendorRemoteDataSource){}
 async getAllVendors(q?:{search?:string;active?:boolean|null}):Promise<Vendor[]>{return (await this.remote.list(q)).map(VendorMapper.toDomain);}
 async getVendorById(id:string):Promise<Vendor>{return VendorMapper.toDomain(await this.remote.get(id));}
 async deleteVendor(id:string):Promise<void>{return this.remote.delete(id);}
 async saveVendor(v:CreateVendor):Promise<Vendor>{return VendorMapper.toDomain(await this.remote.create(VendorMapper.toCreateDto(v)));}
 async modifyVendor(id:string,v:UpdateVendor):Promise<Vendor>{return VendorMapper.toDomain(await this.remote.update(id,VendorMapper.toUpdateDto(v)));}
}