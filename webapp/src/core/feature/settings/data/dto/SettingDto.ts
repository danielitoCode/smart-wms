export type SettingDto = {
	key: string;
	value: string;
};

export type UpdateSettingsRequestDto = {
	settings: Record<string, string>;
};
