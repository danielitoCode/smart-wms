/**
 * Desk Computer engine — interactive isometric PC (keys, mouse, CRT, CD tray).
 *
 * IMPORTANT: Replace this stub with the full engine from the migration artifacts
 * (desk-computer-engine.ts, ~49 KB). The full file exports the same API and
 * implements typing, mouse drag, CD load/eject, power, idle tour, and Web Audio.
 */
export type DeskEngine = {
	replayIntro: () => void;
	setMuted: (muted: boolean) => void;
	destroy: () => void;
};

export function mountDeskComputer(_opts: {
	stage: HTMLElement;
	svg: SVGSVGElement;
	status: HTMLElement;
	muted?: boolean;
}): DeskEngine {
	console.warn(
		'[DeskComputer] Full engine not loaded. Copy desk-computer-engine.ts from migration artifacts into this path.'
	);
	return {
		replayIntro() {},
		setMuted() {},
		destroy() {}
	};
}
