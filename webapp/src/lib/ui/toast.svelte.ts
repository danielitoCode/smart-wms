export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export type ToastItem = {
	id: number;
	message: string;
	tone: ToastTone;
};

let seq = 0;
let items = $state<ToastItem[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();

function clearTimer(id: number) {
	const t = timers.get(id);
	if (t) {
		clearTimeout(t);
		timers.delete(id);
	}
}

export function dismissToast(id: number) {
	clearTimer(id);
	items = items.filter((t) => t.id !== id);
}

/**
 * Toast global de feedback breve (éxito / error de acción).
 * Auto-cierre ~4.2s. Respetar reduced-motion vía CSS.
 */
export function pushToast(message: string, tone: ToastTone = 'info', durationMs = 4200) {
	const id = ++seq;
	items = [...items, { id, message, tone }];
	if (durationMs > 0 && typeof window !== 'undefined') {
		const timer = setTimeout(() => dismissToast(id), durationMs);
		timers.set(id, timer);
	}
	return id;
}

export function getToasts(): ToastItem[] {
	return items;
}

/** Acceso reactivo para el host. */
export const toastStore = {
	get items() {
		return items;
	},
	push: pushToast,
	dismiss: dismissToast
};
