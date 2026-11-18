/**
 * Safe diagnostic hooks for HTTP traffic.
 * Never logs cookies, Authorization, CSRF, or request/response bodies with secrets.
 */

export type ApiDiagnosticEvent = {
	requestId: string;
	method: string;
	/** Path only — no full absolute URL with tokens */
	path: string;
	status?: number;
	durationMs: number;
	ok: boolean;
	code?: string;
	aborted?: boolean;
};

type Listener = (event: ApiDiagnosticEvent) => void;

const listeners = new Set<Listener>();

export function subscribeApiDiagnostics(listener: Listener): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function emitApiDiagnostic(event: ApiDiagnosticEvent): void {
	for (const listener of listeners) {
		try {
			listener(event);
		} catch {
			/* diagnostics must not break the request path */
		}
	}
	if (typeof console !== 'undefined' && console.debug) {
		console.debug('[api]', {
			id: event.requestId,
			method: event.method,
			path: event.path,
			status: event.status,
			ms: event.durationMs,
			ok: event.ok,
			code: event.code,
			aborted: event.aborted
		});
	}
}

let seq = 0;
export function nextRequestId(): string {
	seq = (seq + 1) % 1_000_000;
	return `req_${Date.now().toString(36)}_${seq}`;
}
