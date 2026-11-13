import type { Setting, SettingsMap } from '../entity/Setting';

export interface SettingsRepository {
	get(key: string): Promise<Setting>;
	listKnown(keys: readonly string[]): Promise<SettingsMap>;
	update(settings: SettingsMap): Promise<void>;
}
