export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'abellis-theme';

function systemPrefersDark(): boolean {
	if (typeof window === 'undefined' || !window.matchMedia) return false;
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStored(): ThemeMode | null {
	try {
		const v = localStorage.getItem(STORAGE_KEY);
		if (v === 'light' || v === 'dark') return v;
	} catch {
		/* storage blocked */
	}
	return null;
}

function applyDom(mode: ThemeMode) {
	if (typeof document === 'undefined') return;
	document.documentElement.dataset.theme = mode;
	document.documentElement.style.colorScheme = mode;
}

let mode = $state<ThemeMode>('light');
let ready = $state(false);

export function createThemeState() {
	function setMode(next: ThemeMode) {
		mode = next;
		applyDom(next);
		try {
			localStorage.setItem(STORAGE_KEY, next);
		} catch {
			/* ignore */
		}
	}

	function toggle() {
		setMode(mode === 'dark' ? 'light' : 'dark');
	}

	function init() {
		const stored = readStored();
		const initial = stored ?? (systemPrefersDark() ? 'dark' : 'light');
		mode = initial;
		applyDom(initial);
		ready = true;
	}

	return {
		get mode() {
			return mode;
		},
		get ready() {
			return ready;
		},
		get isDark() {
			return mode === 'dark';
		},
		setMode,
		toggle,
		init
	};
}

export type ThemeState = ReturnType<typeof createThemeState>;
