import type { SettingsRepository } from '../repository/SettingsRepository';
import type { SettingsMap } from '../entity/Setting';
import { KNOWN_SETTING_KEYS } from '../entity/Setting';

export class ListKnownSettingsUseCase {
	constructor(private readonly repository: SettingsRepository) {}
	execute(keys: readonly string[] = KNOWN_SETTING_KEYS) {
		if (keys.length === 0) throw new Error('Se requiere al menos una clave de configuración');
		return this.repository.listKnown(keys);
	}
}

export class UpdateSettingsUseCase {
	constructor(private readonly repository: SettingsRepository) {}
	execute(settings: SettingsMap) {
		const entries = Object.entries(settings).filter(([, v]) => v !== undefined);
		if (entries.length === 0) throw new Error('No hay cambios para guardar');
		return this.repository.update(Object.fromEntries(entries));
	}
}
