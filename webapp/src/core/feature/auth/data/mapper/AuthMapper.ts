import type { User } from '../../domain/entity/User';
import type { UserDto } from '../dto/AuthDto';

export const AuthMapper = {
	toUser(dto: UserDto): User {
		const warehouseIds = dto.warehouse_ids;

		return {
			userId: dto.user_id,
			username: dto.username,
			fullName: dto.full_name,
			role: dto.role,
			warehouseId: dto.warehouse_id ?? warehouseIds[0] ?? null,
			warehouseIds,
			allowedFunctions: dto.allowed_functions ?? [],
			allowedPages: dto.allowed_pages ?? [],
			allowedOverrides: dto.allowed_overrides ?? [],
			isActive: dto.is_active ?? true,
			// Backend defaults require_packing to true unless explicitly disabled.
			requirePacking: dto.require_packing ?? true,
			mustChangePassword: dto.must_change_password ?? false
		};
	}
};
