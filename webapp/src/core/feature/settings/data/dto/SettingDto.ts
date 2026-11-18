export type SettingDto = {
	key: string;
	value: string;
};

export type SettingDetailDto = SettingDto;

export type SettingListItemDto = SettingDto & {
	id: number;
	updated_at: string | null;
};

export type SettingsListDto = {
	settings: SettingListItemDto[];
};

export type UpdateSettingsRequestDto = {
	settings: Record<string, string>;
};

export type UpdateSettingsResponseDto = {
	message: string;
};
