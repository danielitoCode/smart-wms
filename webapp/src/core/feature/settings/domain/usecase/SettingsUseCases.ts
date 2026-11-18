import type { SettingsRepository } from '../repository/SettingsRepository';
import {
	isKnownSettingKey,
	validateSettings,
	type SettingsMap
} from '../entity/Setting';

export class GetSettingsUseCase {
	constructor(private readonly repository: SettingsRepository) {}
	execute() {
		return this.repository.list();
	}
}

export class GetSettingUseCase {
	constructor(private readonly repository: SettingsRepository) {}
	async execute(key: string) {
		if (!isKnownSettingKey(key)) throw new Error(`Clave de configuración desconocida: ${key}`);
		return this.repository.get(key);
	}
}

export class UpdateSettingsUseCase {
	constructor(private readonly repository: SettingsRepository) {}
	async execute(settings: SettingsMap) {
		if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
			throw new Error('Los ajustes deben ser un objeto');
		}
		const entries = Object.entries(settings);
		if (entries.length === 0) throw new Error('No hay cambios para guardar');
		const normalized = Object.fromEntries(entries);
		const errors = validateSettings(normalized);
		if (errors.length > 0) throw new Error(errors.join('. '));
		await this.repository.update(normalized);
	}
}
