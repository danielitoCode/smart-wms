import { createSettingsDependencies } from '../../di/settings.dependencies';
import { KNOWN_SETTING_KEYS, type SettingsMap } from '../../domain/entity/Setting';
import { toUserMessage } from '../../../../infrastructure/errors/ApiError';

const deps = createSettingsDependencies();

export function createSettingsState() {
	let values = $state<SettingsMap>({});
	let draft = $state<SettingsMap>({});
	let loading = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);
	let saved = $state(false);

	async function load() {
		if (loading) return;
		loading = true;
		error = null;
		saved = false;
		try {
			values = await deps.listKnown.execute(KNOWN_SETTING_KEYS);
			draft = { ...values };
		} catch (e) {
			error = toUserMessage(e, 'No se pudieron cargar los ajustes');
		} finally {
			loading = false;
		}
	}

	function setDraft(key: string, value: string) {
		draft = { ...draft, [key]: value };
		saved = false;
	}

	async function save() {
		if (saving) return false;
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
			values = { ...draft };
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
		setDraft,
		load,
		save
	};
}
