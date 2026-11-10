import type { User } from '../../domain/entity/User';
import type { UserDto } from '../dto/AuthDto';

export const AuthMapper = {
	toUser(dto: UserDto): User {
		const warehouseIds =
			dto.warehouse_ids ?? (dto.warehouse_id != null ? [dto.warehouse_id] : []);

		return {
			userId: dto.user_id,
			username: dto.username,
			fullName: dto.full_name,
			role: dto.role,
			warehouseId: dto.warehouse_id ?? warehouseIds[0] ?? null,
			warehouseIds,
			allowedFunctions: dto.allowed_functions ?? [],
			isActive: dto.is_active ?? true,
			requirePacking: dto.require_packing ?? false
		};
	}
};
