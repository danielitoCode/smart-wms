import type { Setting, SettingsMap } from '../entity/Setting';

export interface SettingsRepository {
	get(key: string): Promise<Setting>;
	list(): Promise<SettingsMap>;
	update(settings: SettingsMap): Promise<void>;
}
