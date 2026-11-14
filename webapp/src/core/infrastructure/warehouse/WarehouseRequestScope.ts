/**
 * Active-warehouse request scope.
 * - generation bumps on warehouse change
 * - pending fetches for the previous generation are aborted
 * - callers must drop responses when generation no longer matches
 */

let generation = 0;
const pending = new Set<AbortController>();

export function getWarehouseGeneration(): number {
	return generation;
}

/** Call when the active warehouse changes. Cancels in-flight scoped requests. */
export function notifyWarehouseChanged(): number {
	generation += 1;
	for (const controller of pending) {
		controller.abort();
	}
	pending.clear();
	return generation;
}

export type WarehouseScopedRequest = {
	signal: AbortSignal;
	generation: number;
	/** True while this request still belongs to the active warehouse generation. */
	isCurrent: () => boolean;
	/** Release bookkeeping after settle (success or failure). */
	release: () => void;
};

export function beginWarehouseScopedRequest(): WarehouseScopedRequest {
	const controller = new AbortController();
	const gen = generation;
	pending.add(controller);
	return {
		signal: controller.signal,
		generation: gen,
		isCurrent: () => gen === generation,
		release: () => {
			pending.delete(controller);
		}
	};
}

/** Test helper — reset module state between cases. */
export function resetWarehouseRequestScopeForTests(): void {
	generation = 0;
	for (const controller of pending) controller.abort();
	pending.clear();
}
