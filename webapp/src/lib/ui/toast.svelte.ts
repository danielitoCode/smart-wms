/**
 * Compatibilidad con el API histórico `pushToast(message, tone)`.
 * Delega en el sistema de toasts squircle (`lib/components/toast`).
 */
import {
	toast as rareToast,
	type ToastOptions
} from '../components/toast/toast.store';

export type ToastTone = 'info' | 'success' | 'warning' | 'error';

const TONE_TITLE: Record<ToastTone, string> = {
	info: 'Aviso',
	success: 'Listo',
	warning: 'Atención',
	error: 'Error'
};

/**
 * Feedback breve global (éxito / error de acción).
 * Auto-cierre por defecto ~4.2s.
 */
export function pushToast(
	message: string,
	tone: ToastTone = 'info',
	durationMs = 4200,
	title?: string
) {
	const heading = title?.trim() || TONE_TITLE[tone];
	const options: ToastOptions = {
		description: message,
		duration: durationMs
	};

	switch (tone) {
		case 'success':
			return rareToast.success(heading, options);
		case 'error':
			return rareToast.error(heading, options);
		case 'warning':
			return rareToast.warning(heading, options);
		case 'info':
		default:
			return rareToast.info(heading, options);
	}
}

export function dismissToast(id?: string | number) {
	rareToast.dismiss(id);
}

/** Acceso al API nuevo (success / error / promise / …). */
export const toast = rareToast;

/**
 * @deprecated Usar `toast` o `pushToast`. Conservado por si algún host legado lee `.items`.
 */
export const toastStore = {
	get items() {
		return [];
	},
	push: pushToast,
	dismiss: dismissToast
};
