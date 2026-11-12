import type {ManagedUser,CreateManagedUser,UpdateManagedUser,UserPagePermissions,UpdateUserPagePermissions} from '../../domain/entity/UserManagement';
import type {ManagedUserDto,UserPermissionsDto} from '../dto/ManagedUserDto';
export const ManagedUserMapper={
 toDomain(d:ManagedUserDto):ManagedUser{return {userId:d.user_id,username:d.username,fullName:d.full_name,role:d.role,warehouseId:d.warehouse_id,warehouseIds:d.warehouse_ids??[],allowedFunctions:d.allowed_functions??[],isActive:d.is_active,createdAt:d.created_at,lastLogin:d.last_login};},
 permissionsToDomain(d:UserPermissionsDto):UserPagePermissions{return {userId:d.user_id,role:d.role,pageKeys:d.page_keys??[],isFullAccess:d.is_full_access};},
 createToDto(v:CreateManagedUser){return {username:v.username,password:v.password,full_name:v.fullName,role:v.role,warehouse_ids:v.warehouseIds??[],warehouse_id:v.warehouseId??null,allowed_functions:v.allowedFunctions??[]};},
 updateToDto(v:UpdateManagedUser){const d:Record<string,unknown>={};if(v.fullName!==undefined)d.full_name=v.fullName;if(v.role!==undefined)d.role=v.role;if(v.warehouseId!==undefined)d.warehouse_id=v.warehouseId;if(v.warehouseIds!==undefined)d.warehouse_ids=v.warehouseIds;if(v.allowedFunctions!==undefined)d.allowed_functions=v.allowedFunctions;if(v.isActive!==undefined)d.is_active=v.isActive;if(v.password!==undefined&&v.password!=='')d.password=v.password;return d;},
 permissionsToDto(v:UpdateUserPagePermissions){return {page_keys:v.pageKeys};}
};