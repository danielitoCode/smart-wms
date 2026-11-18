import type { UserRole } from '../../domain/entity/User';

export type UserDto = {
	user_id: number;
	username: string;
	full_name: string;
	role: UserRole;
	warehouse_id: number | null;
	warehouse_ids: number[];
	allowed_functions: string[];
	allowed_pages?: string[];
	allowed_overrides?: string[];
	is_active?: boolean;
	require_packing?: boolean;
	must_change_password: boolean;
};

export type LoginResponseDto = { token: string; user: UserDto };
export type MeResponseDto = UserDto;
export type RefreshResponseDto = { token: string };
export type LogoutResponseDto = { message: string };
export type ChangePasswordRequestDto = {
	current_password: string;
	new_password: string;
};
export type ChangePasswordResponseDto = { message: string };
