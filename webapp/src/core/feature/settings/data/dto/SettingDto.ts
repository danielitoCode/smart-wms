export type SettingDto = {
	key: string;
	value: string;
};

export type SettingsListDto = {
	settings: Array<SettingDto & { id?: number; updated_at?: string | null }>;
};

export type UpdateSettingsRequestDto = {
	settings: Record<string, string>;
};

export type UpdateSettingsResponseDto = {
	message: string;
};
