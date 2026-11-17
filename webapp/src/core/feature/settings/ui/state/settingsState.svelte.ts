import { createSettingsDependencies } from '../../di/settings.dependencies';
import {
	KNOWN_SETTING_KEYS,
	SETTING_DEFINITIONS,
	validateSettingValue,
	withSettingDefaults,
	type KnownSettingKey,
	type SettingsMap
} from '../../domain/entity/Setting';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createSettingsDependencies();

export function createSettingsState() {
	let values = $state<SettingsMap>({});
	let draft = $state<SettingsMap>({});
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);
	let validationErrors = $state<Record<string, string>>({});

	async function load() {
		if (loading) return;
		loading = true;
		error = null;
		saved = false;
		try {
			const persisted = await deps.getSettings.execute();
			values = withSettingDefaults(persisted);
			draft = { ...values };
			validationErrors = {};
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron cargar los ajustes');
		} finally {
			loading = false;
		}
	}

	function setDraft(key: string, value: string) {
		if (!KNOWN_SETTING_KEYS.includes(key as KnownSettingKey)) {
			error = `Clave de configuración desconocida: ${key}`;
			return;
		}
		draft = { ...draft, [key]: value };
		saved = false;
		error = null;
		const message = validateSettingValue(key, value);
		const next = { ...validationErrors };
		if (message) next[key] = message;
		else delete next[key];
		validationErrors = next;
	}

	function validateDraft(): Record<string, string> {
		const next: Record<string, string> = {};
		for (const key of KNOWN_SETTING_KEYS) {
			const message = validateSettingValue(key, draft[key] ?? '');
			if (message) next[key] = message;
		}
		validationErrors = next;
		return next;
	}

	function getSensitiveChanges(): KnownSettingKey[] {
		return SETTING_DEFINITIONS
			.filter((definition) => definition.sensitive)
			.filter((definition) => (draft[definition.key] ?? '') !== (values[definition.key] ?? ''))
			.map((definition) => definition.key);
	}

	function discard() {
		draft = { ...values };
		validationErrors = {};
		error = null;
		saved = false;
	}

	async function save() {
		if (saving) return false;
		const invalid = validateDraft();
		if (Object.keys(invalid).length > 0) {
			error = 'Corrige los valores indicados antes de guardar.';
			return false;
		}
		saving = true;
		error = null;
		saved = false;
		try {
			const changed: SettingsMap = {};
			for (const key of KNOWN_SETTING_KEYS) {
				if ((draft[key] ?? '') !== (values[key] ?? '')) changed[key] = draft[key] ?? '';
			}
			if (Object.keys(changed).length === 0) {
				saved = true;
				return true;
			}
			await deps.update.execute(changed);
			values = { ...values, ...changed };
			draft = { ...values };
			validationErrors = {};
			saved = true;
			return true;
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron guardar los ajustes');
			return false;
		} finally {
			saving = false;
		}
	}

	return {
		get values() { return values; },
		get draft() { return draft; },
		get loading() { return loading; },
		get saving() { return saving; },
		get error() { return error; },
		get saved() { return saved; },
		get validationErrors() { return validationErrors; },
		get hasChanges() {
			return KNOWN_SETTING_KEYS.some((key) => (draft[key] ?? '') !== (values[key] ?? ''));
		},
		setDraft,
		validateDraft,
		getSensitiveChanges,
		discard,
		load,
		save
	};
}
