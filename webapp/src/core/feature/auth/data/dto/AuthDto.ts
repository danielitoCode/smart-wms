/** DTOs mirror SentryWMS /api/auth JSON (snake_case). */

export type UserDto = {
	user_id: number;
	username: string;
	full_name: string;
	role: string;
	warehouse_id?: number | null;
	warehouse_ids?: number[];
	allowed_functions?: string[];
	is_active?: boolean;
	require_packing?: boolean;
};

export type LoginResponseDto = {
	token: string;
	user: UserDto;
};

export type MeResponseDto = UserDto;

export type RefreshResponseDto = {
	token: string;
};
