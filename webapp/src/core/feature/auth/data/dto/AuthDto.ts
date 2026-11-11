import type { UserRole } from '../../domain/entity/User';

/** DTOs mirror the Flask /api/auth JSON contract (snake_case). */
export type UserDto = {
	user_id: number;
	username: string;
	full_name: string;
	role: UserRole;
	warehouse_id?: number | null;
	warehouse_ids?: number[];
	allowed_functions?: string[];
	allowed_pages?: string[];
	allowed_overrides?: string[];
	is_active?: boolean;
	require_packing?: boolean;
	must_change_password?: boolean;
};

export type LoginResponseDto = {
	/** Returned for bearer-token clients; browser auth uses the HttpOnly cookie. */
	token: string;
	user: UserDto;
};

export type MeResponseDto = UserDto;
export type RefreshResponseDto = { token: string };
export type LogoutResponseDto = { message: string };
