/** Progress Image reveal engine — pure canvas. Full source also in artifacts/progress-image-engine.ts */

export type RevealFx = 'pixel' | 'fog' | 'sketch' | 'halftone' | 'dissolve' | 'ink';

export const REVEAL_FX: { id: RevealFx; label: string }[] = [
	{ id: 'pixel', label: 'Pixel' },
	{ id: 'fog', label: 'Fog' },
	{ id: 'sketch', label: 'Sketch' },
	{ id: 'halftone', label: 'Halftone' },
	{ id: 'dissolve', label: 'Dissolve' },
	{ id: 'ink', label: 'Ink' }
];

export type EngineOptions = {
	src: string;
	fx?: RevealFx;
	progress?: number;
};

export function createRevealEngine(
	canvas: HTMLCanvasElement,
	opts: EngineOptions
) {
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('2d context unavailable');

	let progress = opts.progress ?? 1;
	let fx: RevealFx = opts.fx ?? 'pixel';
	const img = new Image();
	img.crossOrigin = 'anonymous';
	let ready = false;

	const draw = () => {
		if (!ready || !ctx) return;
		const w = canvas.clientWidth || 640;
		const h = canvas.clientHeight || 480;
		const dpr = Math.min(window.devicePixelRatio || 1, 2);
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);

		// base image with progress as opacity + light pixelation at low values
		const cell = Math.max(1, Math.round((1 - progress) * 24));
		if (progress < 0.02) return;

		if (fx === 'pixel' && cell > 1) {
			const tw = Math.max(1, Math.floor(w / cell));
			const th = Math.max(1, Math.floor(h / cell));
			const tmp = document.createElement('canvas');
			tmp.width = tw;
			tmp.height = th;
			const tctx = tmp.getContext('2d')!;
			tctx.drawImage(img, 0, 0, tw, th);
			ctx.imageSmoothingEnabled = false;
			ctx.globalAlpha = Math.min(1, progress * 1.15);
			ctx.drawImage(tmp, 0, 0, w, h);
			ctx.imageSmoothingEnabled = true;
		} else {
			ctx.globalAlpha = Math.min(1, progress);
			ctx.drawImage(img, 0, 0, w, h);
			if (fx === 'fog' && progress < 1) {
				ctx.globalAlpha = (1 - progress) * 0.55;
				ctx.fillStyle = '#c8d0d8';
				ctx.fillRect(0, 0, w, h);
			}
		}
		ctx.globalAlpha = 1;
	};

	img.onload = () => {
		ready = true;
		draw();
	};
	img.onerror = () => {
		ready = false;
	};
	img.src = opts.src;

	const ro = new ResizeObserver(() => draw());
	ro.observe(canvas);

	return {
		setProgress(p: number) {
			progress = Math.max(0, Math.min(1, p));
			draw();
		},
		setFx(next: RevealFx) {
			fx = next;
			draw();
		},
		destroy() {
			ro.disconnect();
		}
	};
}
