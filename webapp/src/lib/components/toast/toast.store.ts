/**
 * Toast queue — API compatible con el export `toast` del componente React (Sonner-like).
 */
export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastAction = {
	label: string;
	onClick: () => void;
};

export type ToastOptions = {
	description?: string;
	action?: ToastAction;
	duration?: number;
	dismissible?: boolean;
	id?: string | number;
};

export type ToastItem = {
	id: string | number;
	type: ToastType;
	title: string;
	description?: string;
	action?: ToastAction;
	dismissible: boolean;
	duration: number;
	createdAt: number;
};

export type ToastPromiseMessages<T> = {
	loading: string;
	success: string | ((data: T) => string);
	error: string | ((error: unknown) => string);
};

type Listener = () => void;

let seq = 0;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();

function emit() {
	for (const l of listeners) l();
}

function nextId() {
	seq += 1;
	return `toast-${seq}-${Date.now()}`;
}

export function getToasts(): ToastItem[] {
	return items;
}

export function subscribeToasts(fn: Listener): () => void {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

const DEFAULT_DURATION = 4200;

function upsert(partial: Omit<ToastItem, 'createdAt'> & { createdAt?: number }) {
	const existing = items.findIndex((t) => t.id === partial.id);
	const item: ToastItem = {
		...partial,
		createdAt: partial.createdAt ?? Date.now()
	};
	if (existing >= 0) {
		items = [...items.slice(0, existing), item, ...items.slice(existing + 1)];
	} else {
		items = [...items, item];
	}
	emit();
	return item.id;
}

function show(type: ToastType, title: string, options: ToastOptions = {}) {
	const id = options.id ?? nextId();
	const duration =
		options.duration ?? (type === 'loading' ? Number.POSITIVE_INFINITY : DEFAULT_DURATION);

	upsert({
		id,
		type,
		title,
		description: options.description,
		action: options.action,
		dismissible: options.dismissible ?? true,
		duration
	});

	if (Number.isFinite(duration) && duration > 0) {
		window.setTimeout(() => {
			dismiss(id);
		}, duration);
	}

	return id;
}

function dismiss(id?: string | number) {
	if (id === undefined) {
		items = [];
	} else {
		items = items.filter((t) => t.id !== id);
	}
	emit();
}

function variant(type: ToastType) {
	return (title: string, options?: ToastOptions) => show(type, title, options);
}

function resolveMsg<V>(value: string | ((input: V) => string), input: V): string {
	return typeof value === 'function' ? value(input) : value;
}

function promiseToast<T>(
	task: Promise<T> | (() => Promise<T>),
	messages: ToastPromiseMessages<T>,
	options: ToastOptions = {}
) {
	const id = show('loading', messages.loading, {
		...options,
		duration: Number.POSITIVE_INFINITY
	});

	const pending = typeof task === 'function' ? task() : task;

	pending
		.then((data) => {
			show('success', resolveMsg(messages.success, data), {
				...options,
				id,
				duration: options.duration ?? DEFAULT_DURATION
			});
		})
		.catch((error) => {
			show('error', resolveMsg(messages.error, error), {
				...options,
				id,
				duration: options.duration ?? DEFAULT_DURATION
			});
		});

	return pending;
}

export const toast = Object.assign(variant('default'), {
	success: variant('success'),
	error: variant('error'),
	warning: variant('warning'),
	info: variant('info'),
	loading: variant('loading'),
	promise: promiseToast,
	dismiss
});
