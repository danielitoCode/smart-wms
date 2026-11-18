import type {
	ManagedUser,
	ManagedWarehouse, CreateManagedUser, UpdateManagedUser,
	UserPagePermissions, UpdateUserPagePermissions,
} from '../../domain/entity/UserManagement';
import type {
	ManagedWarehouseDto,
	ManagedUserDto, UserPermissionsDto, CreateManagedUserRequestDto,
	UpdateManagedUserRequestDto, UpdateUserPermissionsRequestDto,
} from '../dto/ManagedUserDto';

export const ManagedUserMapper = {
	warehouseToDomain(dto: ManagedWarehouseDto): ManagedWarehouse {
		return { warehouseId:dto.warehouse_id, warehouseCode:dto.warehouse_code, warehouseName:dto.warehouse_name, isActive:dto.is_active };
	},
	toDomain(dto: ManagedUserDto): ManagedUser {
		return {
			userId: dto.user_id,
			username: dto.username,
			fullName: dto.full_name,
			role: dto.role,
			warehouseId: dto.warehouse_id ?? null,
			warehouseIds: dto.warehouse_ids ?? [],
			allowedFunctions: dto.allowed_functions ?? [],
			isActive: dto.is_active,
			mustChangePassword: dto.must_change_password ?? false,
			createdAt: dto.created_at ?? null,
			lastLogin: dto.last_login ?? null,
		};
	},

	permissionsToDomain(dto: UserPermissionsDto): UserPagePermissions {
		return {
			userId: dto.user_id,
			role: dto.role,
			pageKeys: dto.page_keys ?? [],
			isFullAccess: dto.is_full_access,
		};
	},

	createToDto(input: CreateManagedUser): CreateManagedUserRequestDto {
		return {
			username: input.username,
			password: input.password,
			full_name: input.fullName,
			role: input.role,
			warehouse_ids: input.warehouseIds ?? [],
			warehouse_id: input.warehouseIds?.[0] ?? input.warehouseId ?? null,
			allowed_functions: input.allowedFunctions ?? [],
			must_change_password: input.mustChangePassword ?? false,
		};
	},

	updateToDto(input: UpdateManagedUser): UpdateManagedUserRequestDto {
		const dto: UpdateManagedUserRequestDto = {};
		if (input.fullName !== undefined) dto.full_name = input.fullName;
		if (input.role !== undefined) dto.role = input.role;
		if (input.warehouseIds !== undefined) {
			// The multi-warehouse list is authoritative; [] explicitly clears it.
			dto.warehouse_ids = input.warehouseIds;
			// When empty, omit the legacy mirror. Flask clears it from the
			// authoritative empty array; sending null is not needed.
			if (input.warehouseIds.length > 0) dto.warehouse_id = input.warehouseIds[0];
		} else if (input.warehouseId !== undefined) {
			dto.warehouse_id = input.warehouseId;
		}
		if (input.allowedFunctions !== undefined) dto.allowed_functions = input.allowedFunctions;
		if (input.isActive !== undefined) dto.is_active = input.isActive;
		if (input.mustChangePassword !== undefined) dto.must_change_password = input.mustChangePassword;
		if (input.password !== undefined && input.password !== '') dto.password = input.password;
		return dto;
	},

	permissionsToDto(input: UpdateUserPagePermissions): UpdateUserPermissionsRequestDto {
		return { page_keys: input.pageKeys };
	},
};
