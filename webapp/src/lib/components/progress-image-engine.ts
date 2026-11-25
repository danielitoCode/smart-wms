/** Progress Image reveal engine — pure canvas (pixel quadtree + per-pixel looks). */

export type RevealFx = 'pixel' | 'fog' | 'sketch' | 'halftone' | 'dissolve' | 'ink';

export const REVEAL_FX: { id: RevealFx; label: string }[] = [
	{ id: 'pixel', label: 'Pixel' },
	{ id: 'fog', label: 'Fog' },
	{ id: 'sketch', label: 'Sketch' },
	{ id: 'halftone', label: 'Halftone' },
	{ id: 'dissolve', label: 'Dissolve' },
	{ id: 'ink', label: 'Ink' }
];

const SIZES = [48, 24, 12, 6];
const RANGES: [number, number][] = [
	[0, 0.18],
	[0.1, 0.36],
	[0.24, 0.52],
	[0.38, 0.68],
	[0.52, 0.9]
];
const FADE = 0.05;

const rng = (seed: number) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const canvas = (w: number, h: number) => {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
};

type Blend = {
	from: Uint8ClampedArray;
	T: Uint8Array;
	soft: number;
	edge?: number;
	ink?: [number, number, number];
};

type Tile = { x: number; y: number; level: number; thr: number; kids: Tile[] | null };

export function createRevealEngine(photo: HTMLCanvasElement, img: HTMLImageElement) {
	const pctx = photo.getContext('2d', { willReadFrequently: true })!;
	let dpr = 1;
	let cssW = 0;
	let cssH = 0;
	let PW = 0;
	let PH = 0;
	let full: HTMLCanvasElement | null = null;
	let levels: HTMLCanvasElement[] = [];
	let roots: Tile[] = [];
	let photoPx: Uint8ClampedArray | null = null;
	let lum: Uint8Array | null = null;
	let outImg: ImageData | null = null;
	const cache = new Map<RevealFx, Blend>();

	function buildPixel() {
		levels = SIZES.map((s) => {
			const c = canvas(Math.ceil(cssW / s), Math.ceil(cssH / s));
			const x = c.getContext('2d')!;
			x.imageSmoothingQuality = 'high';
			x.drawImage(img, 0, 0, c.width, c.height);
			x.drawImage(img, 0, 0, cssW / s, cssH / s);
			return c;
		});
		const rand = rng(1015);
		const node = (x: number, y: number, level: number, parentThr: number): Tile => {
			const [a, b] = RANGES[level];
			const s = SIZES[Math.min(level, SIZES.length - 1)];
			const d = Math.hypot((x + s / 2) / cssW - 0.5, (y + s / 2) / cssH - 0.5) / 0.7071;
			const u = 0.7 * rand() + 0.3 * Math.min(1, d);
			return { x, y, level, thr: Math.max(a + (b - a) * u, parentThr + FADE * 0.6), kids: null };
		};
		const split = (n: Tile) => {
			if (n.level >= SIZES.length) return;
			const s = SIZES[n.level] / 2;
			const L = n.level + 1;
			n.kids = [];
			for (const [ox, oy] of [
				[0, 0],
				[s, 0],
				[0, s],
				[s, s]
			] as const) {
				if (n.x + ox >= cssW || n.y + oy >= cssH) continue;
				const k = node(n.x + ox, n.y + oy, L, n.thr);
				split(k);
				n.kids.push(k);
			}
		};
		roots = [];
		for (let y = 0; y < cssH; y += SIZES[0]) {
			for (let x = 0; x < cssW; x += SIZES[0]) {
				const r = node(x, y, 0, -1);
				split(r);
				roots.push(r);
			}
		}
	}

	const px = (v: number) => Math.round(v * dpr);

	function drawTile(n: Tile) {
		const dx = px(n.x);
		const dy = px(n.y);
		const s = SIZES[Math.min(n.level, SIZES.length - 1)];
		const dw = px(Math.min(n.x + s, cssW)) - dx;
		const dh = px(Math.min(n.y + s, cssH)) - dy;
		if (n.level >= SIZES.length) pctx.drawImage(full!, dx, dy, dw, dh, dx, dy, dw, dh);
		else pctx.drawImage(levels[n.level], n.x / s, n.y / s, 1, 1, dx, dy, dw, dh);
	}

	function drawNode(n: Tile, p: number, alpha: number) {
		if (!n.kids || p < n.thr) {
			pctx.globalAlpha = alpha;
			drawTile(n);
			return;
		}
		const k = (p - n.thr) / FADE;
		if (k < 1) {
			pctx.globalAlpha = alpha;
			drawTile(n);
		}
		const a = alpha * Math.min(1, k);
		for (const c of n.kids) drawNode(c, p, a);
	}

	function fbm(seed: number, octaves: [number, number, number][]) {
		const rand = rng(seed);
		const c = canvas(PW, PH);
		const x = c.getContext('2d', { willReadFrequently: true })!;
		x.imageSmoothingEnabled = true;
		x.imageSmoothingQuality = 'high';
		octaves.forEach(([gw, gh, alpha], i) => {
			const g = canvas(gw, gh);
			const gx = g.getContext('2d')!;
			const d = gx.createImageData(gw, gh);
			for (let k = 0; k < gw * gh; k++) {
				const v = (rand() * 255) | 0;
				d.data.set([v, v, v, 255], k * 4);
			}
			gx.putImageData(d, 0, 0);
			x.globalAlpha = i === 0 ? 1 : alpha;
			x.drawImage(g, 0, 0, PW, PH);
		});
		const src = x.getImageData(0, 0, PW, PH).data;
		const out = new Uint8Array(PW * PH);
		let lo = 255;
		let hi = 0;
		for (let i = 0; i < out.length; i++) {
			const v = src[i * 4];
			if (v < lo) lo = v;
			if (v > hi) hi = v;
		}
		const k = 255 / Math.max(1, hi - lo);
		for (let i = 0; i < out.length; i++) out[i] = (src[i * 4] - lo) * k;
		return out;
	}

	const mixT = (a: Uint8Array, b: Uint8Array, wb: number) => {
		const o = new Uint8Array(a.length);
		for (let i = 0; i < a.length; i++) o[i] = a[i] * (1 - wb) + b[i] * wb;
		return o;
	};

	const solid = (r: number, g: number, b: number) => {
		const o = new Uint8ClampedArray(PW * PH * 4);
		for (let i = 0; i < PW * PH; i++) o.set([r, g, b, 255], i * 4);
		return o;
	};

	const builders: Record<Exclude<RevealFx, 'pixel'>, () => Blend> = {
		fog() {
			const a = canvas(Math.max(2, PW >> 4), Math.max(2, PH >> 4));
			const b = canvas(Math.max(2, PW >> 5), Math.max(2, PH >> 5));
			a.getContext('2d')!.drawImage(full!, 0, 0, a.width, a.height);
			b.getContext('2d')!.drawImage(a, 0, 0, b.width, b.height);
			const c = canvas(PW, PH);
			const cx = c.getContext('2d', { willReadFrequently: true })!;
			cx.imageSmoothingQuality = 'high';
			cx.drawImage(b, 0, 0, PW, PH);
			const from = cx.getImageData(0, 0, PW, PH).data;
			for (let i = 0; i < from.length; i += 4) {
				const g = from[i] * 0.3 + from[i + 1] * 0.59 + from[i + 2] * 0.11;
				from[i] = (g * 0.5 + from[i] * 0.5) * 0.45 + 232 * 0.55;
				from[i + 1] = (g * 0.5 + from[i + 1] * 0.5) * 0.45 + 236 * 0.55;
				from[i + 2] = (g * 0.5 + from[i + 2] * 0.5) * 0.45 + 241 * 0.55;
			}
			return { from, T: fbm(11, [[6, 3, 1], [12, 6, 0.5], [26, 13, 0.3]]), soft: 0.24 };
		},
		sketch() {
			const L = lum!;
			const from = new Uint8ClampedArray(PW * PH * 4);
			const rand = rng(7);
			const at = (x: number, y: number) =>
				L[Math.min(PH - 1, Math.max(0, y)) * PW + Math.min(PW - 1, Math.max(0, x))];
			for (let y = 0; y < PH; y++) {
				for (let x = 0; x < PW; x++) {
					const gx =
						at(x + 1, y - 1) +
						2 * at(x + 1, y) +
						at(x + 1, y + 1) -
						at(x - 1, y - 1) -
						2 * at(x - 1, y) -
						at(x - 1, y + 1);
					const gy =
						at(x - 1, y + 1) +
						2 * at(x, y + 1) +
						at(x + 1, y + 1) -
						at(x - 1, y - 1) -
						2 * at(x, y - 1) -
						at(x + 1, y - 1);
					const edge = Math.min(255, (Math.abs(gx) + Math.abs(gy)) * 0.38);
					const shade = 255 - (255 - at(x, y)) * 0.28;
					const v = Math.min(255 - edge, shade) - rand() * 10;
					const i = (y * PW + x) * 4;
					from[i] = (247 * v) / 255;
					from[i + 1] = (244 * v) / 255;
					from[i + 2] = (237 * v) / 255;
					from[i + 3] = 255;
				}
			}
			return { from, T: mixT(L, fbm(17, [[10, 5, 1], [30, 15, 0.4]]), 0.4), soft: 0.14 };
		},
		halftone() {
			const cell = Math.max(4, Math.round(6 * dpr));
			const sw = Math.ceil(PW / cell) + 1;
			const sh = Math.ceil(PH / cell) + 1;
			const s = canvas(sw, sh);
			const sx = s.getContext('2d', { willReadFrequently: true })!;
			sx.drawImage(full!, 0, 0, sw * cell, sh * cell, 0, 0, sw, sh);
			const avg = sx.getImageData(0, 0, sw, sh).data;
			const c = canvas(PW, PH);
			const cx = c.getContext('2d', { willReadFrequently: true })!;
			cx.fillStyle = '#f6f3ec';
			cx.fillRect(0, 0, PW, PH);
			cx.fillStyle = '#1f2c4a';
			for (let gy = 0; gy < sh; gy++) {
				for (let gx = 0; gx < sw; gx++) {
					const i = (gy * sw + gx) * 4;
					const l = (avg[i] * 0.3 + avg[i + 1] * 0.59 + avg[i + 2] * 0.11) / 255;
					const r = cell * 0.6 * Math.sqrt(1 - l);
					if (r < 0.4) continue;
					cx.beginPath();
					cx.arc(gx * cell + (gy % 2 ? cell / 2 : 0), gy * cell + cell / 2, r, 0, Math.PI * 2);
					cx.fill();
				}
			}
			const radial = new Uint8Array(PW * PH);
			for (let y = 0; y < PH; y++) {
				for (let x = 0; x < PW; x++) {
					radial[y * PW + x] = Math.min(
						255,
						(Math.hypot(x / PW - 0.5, (y / PH - 0.5) * (PH / PW)) / 0.56) * 255
					);
				}
			}
			return { from: cx.getImageData(0, 0, PW, PH).data, T: mixT(radial, fbm(23, [[14, 7, 1]]), 0.3), soft: 0.1 };
		},
		dissolve() {
			const L = lum!;
			const from = new Uint8ClampedArray(PW * PH * 4);
			for (let i = 0; i < PW * PH; i++) {
				const g = L[i] * 0.55 + 30;
				from.set([g * 0.92, g * 0.96, g * 1.06, 255], i * 4);
			}
			const b = Math.max(1, Math.round(2 * dpr));
			const rand = rng(31);
			const T = new Uint8Array(PW * PH);
			const bw = Math.ceil(PW / b);
			const cells = new Uint8Array(bw * Math.ceil(PH / b));
			for (let i = 0; i < cells.length; i++) cells[i] = rand() * 255;
			for (let y = 0; y < PH; y++)
				for (let x = 0; x < PW; x++) T[y * PW + x] = cells[((y / b) | 0) * bw + ((x / b) | 0)];
			return { from, T, soft: 0.03 };
		},
		ink() {
			return {
				from: solid(246, 243, 236),
				T: fbm(41, [[7, 4, 1], [18, 9, 0.5], [44, 22, 0.28], [96, 48, 0.14]]),
				soft: 0.05,
				edge: 0.7,
				ink: [24, 34, 62]
			};
		}
	};

	function ensure(id: RevealFx) {
		if (id === 'pixel' || cache.has(id) || !photoPx) return;
		try {
			cache.set(id, builders[id]());
		} catch (err) {
			console.warn(`Transition "${id}" unavailable`, err);
		}
	}

	const lut = new Uint8Array(256);
	const edgeLut = new Uint8Array(256);

	function drawBlend(c: Blend, p: number) {
		const s = c.soft;
		const q = p * (1 + s);
		for (let t = 0; t < 256; t++) {
			let a = (q - t / 255) / s;
			a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
			lut[t] = a * 255;
			edgeLut[t] = c.edge ? 4 * a * (1 - a) * c.edge * 255 : 0;
		}
		const out = outImg!.data;
		const from = c.from;
		const T = c.T;
		const ink = c.ink;
		const ph = photoPx!;
		for (let i = 0, o = 0; i < T.length; i++, o += 4) {
			const a = lut[T[i]];
			if (a === 0) {
				out[o] = from[o];
				out[o + 1] = from[o + 1];
				out[o + 2] = from[o + 2];
			} else if (a === 255) {
				out[o] = ph[o];
				out[o + 1] = ph[o + 1];
				out[o + 2] = ph[o + 2];
			} else {
				const k = a / 255;
				out[o] = from[o] + (ph[o] - from[o]) * k;
				out[o + 1] = from[o + 1] + (ph[o + 1] - from[o + 1]) * k;
				out[o + 2] = from[o + 2] + (ph[o + 2] - from[o + 2]) * k;
				const e = edgeLut[T[i]];
				if (e && ink) {
					const m = e / 255;
					out[o] += (ink[0] - out[o]) * m;
					out[o + 1] += (ink[1] - out[o + 1]) * m;
					out[o + 2] += (ink[2] - out[o + 2]) * m;
				}
			}
			out[o + 3] = 255;
		}
		pctx.putImageData(outImg!, 0, 0);
	}

	return {
		build(pixelRatio = Math.min(2, devicePixelRatio || 1)) {
			dpr = pixelRatio;
			cssW = photo.clientWidth;
			cssH = photo.clientHeight;
			if (!cssW || !cssH) return false;
			PW = photo.width = Math.round(cssW * dpr);
			PH = photo.height = Math.round(cssH * dpr);
			full = canvas(PW, PH);
			const f = full.getContext('2d', { willReadFrequently: true })!;
			f.imageSmoothingQuality = 'high';
			f.drawImage(img, 0, 0, PW, PH);
			buildPixel();
			cache.clear();
			try {
				photoPx = f.getImageData(0, 0, PW, PH).data;
				lum = new Uint8Array(PW * PH);
				for (let i = 0; i < lum.length; i++)
					lum[i] = photoPx[i * 4] * 0.3 + photoPx[i * 4 + 1] * 0.59 + photoPx[i * 4 + 2] * 0.11;
				outImg = pctx.createImageData(PW, PH);
			} catch {
				photoPx = null;
			}
			return true;
		},
		ensure,
		prewarm(): () => void {
			let stopped = false;
			const idle =
				window.requestIdleCallback ??
				((cb: IdleRequestCallback) =>
					window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 16 } as IdleDeadline), 60) as unknown as number);
			const next = () => {
				if (stopped) return;
				const id = REVEAL_FX.map((f) => f.id).find((f) => f !== 'pixel' && !cache.has(f));
				if (!id || !photoPx) return;
				ensure(id);
				if (cache.has(id)) idle(next as IdleRequestCallback);
			};
			idle(next as IdleRequestCallback);
			return () => {
				stopped = true;
			};
		},
		draw(p: number, fx: RevealFx) {
			pctx.globalAlpha = 1;
			pctx.imageSmoothingEnabled = false;
			const c = fx === 'pixel' ? undefined : (ensure(fx), cache.get(fx));
			if (p >= 0.999) pctx.drawImage(full!, 0, 0);
			else if (c) drawBlend(c, p);
			else for (const r of roots) drawNode(r, p, 1);
			pctx.globalAlpha = 1;
		},
		get size() {
			return `${cssW}x${cssH}`;
		}
	};
}
