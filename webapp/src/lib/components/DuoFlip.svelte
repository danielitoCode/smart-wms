<script lang="ts" module>
	/**
	 * DuoFlip — gallery that turns pictures with a liquid fold (WebGL).
	 * Port of motion-brew DuoFlip (MIT). Sample Unsplash images are placeholders.
	 */

	export interface DuoFlipImage {
		src: string;
		alt: string;
		/** Short caption under the card. */
		label?: string;
	}

	export interface DuoFlipProps {
		images?: DuoFlipImage[];
		/** Card width / height. Default 1.5 */
		aspect?: number;
		radius?: number;
		/** Lift past the card, 0–0.5 of height. Default 0.34 */
		flare?: number;
		/** Glass at the fold (blur + fringe), 0–2. Default 1 */
		glass?: number;
		/** Frost while turning (px). Default 24 */
		blur?: number;
		blurNear?: number;
		blurFar?: number;
		noise?: number;
		thickness?: number;
		/** Seconds per turn. Default 1.3 */
		duration?: number;
		autoplay?: boolean;
		interval?: number;
		onChange?: (index: number) => void;
		class?: string;
	}

	const SAMPLE = (id: string) =>
		`https://images.unsplash.com/photo-${id}?w=1400&h=780&fit=crop&q=80`;

	export const DEFAULT_IMAGES: DuoFlipImage[] = [
		{
			src: SAMPLE('1490750967868-88aa4486c946'),
			alt: 'Orange poppies against a blue sky',
			label: 'Poppies'
		},
		{
			src: SAMPLE('1454496522488-7a8e488e8606'),
			alt: 'Snowy mountain peaks under clouds',
			label: 'Snow peaks'
		},
		{
			src: SAMPLE('1441974231531-c6227db76b6e'),
			alt: 'Sun through a forest',
			label: 'Forest light'
		},
		{
			src: SAMPLE('1486406146926-c627a92ad1ab'),
			alt: 'Glass towers seen from below',
			label: 'City glass'
		}
	];

	const PAD_Y = 0.32;
	const PAD_X = 28;

	const VERTEX = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

	const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform vec4 uCard;
uniform float uRadius;
uniform sampler2D uA;
uniform sampler2D uB;
uniform vec2 uAspA;
uniform vec2 uAspB;
uniform float uFold;
uniform float uDir;
uniform float uAmpA;
uniform float uAmpB;
uniform float uFlare;
uniform float uGlass;
uniform float uFall;
uniform float uDpr;
uniform float uSideA;
uniform float uSideB;
uniform float uTime;
uniform float uNear;
uniform float uFar;
uniform float uNoise;
uniform float uThick;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float sdRound(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec4 page(sampler2D t, vec2 asp, vec2 local, float amp, float d, float side, float frost) {
  float W = uCard.z;
  float H = uCard.w;
  float k = exp(-d / uFall);
  float s = 1.0 + amp * k;
  vec2 src = vec2(local.x, (local.y - H * 0.5) / s + H * 0.5);
  float sd = sdRound(src - vec2(W, H) * 0.5, vec2(W, H) * 0.5, uRadius);
  float nl = uFlare > 0.0 ? amp / uFlare : 0.0;
  float rf = 12.0 * uDpr * nl;
  if (rf > 0.5) {
    vec2 c = vec2(uFold + side * W, H * 0.5);
    sd = max(sd, sdRound(src - c, vec2(W, H * 0.5), rf));
  }
  float alpha = clamp(0.5 - sd, 0.0, 1.0);
  vec2 uv = (src / vec2(W, H) - 0.5) * asp + 0.5;
  float n = uFlare > 0.0 ? amp / uFlare : 0.0;
  float lift = uGlass * n * k * 22.0 * uDpr;
  frost *= mix(uNear, uFar, smoothstep(0.0, 1.0, d / W));
  float br = max(lift, frost);
  vec3 col;
  if (br < 0.5) {
    col = texture2D(t, uv).rgb;
  } else {
    vec2 px = asp / vec2(W, H);
    vec2 ca = vec2(side * lift * 0.55, 0.0) * px;
    float spin = hash(gl_FragCoord.xy + uTime) * 6.2832 * uNoise;
    float jit = 1.0 + (hash(gl_FragCoord.yx * 1.7 + uTime) - 0.5) * 0.5 * uNoise;
    vec3 acc = vec3(texture2D(t, uv + ca).r, texture2D(t, uv).g, texture2D(t, uv - ca).b);
    float wsum = 1.0;
    for (int i = 0; i < 12; i++) {
      float a = float(i) * 0.5236 + (i < 6 ? 0.0 : 0.2618) + spin;
      float rr = (i < 6 ? 0.5 : 1.0) * jit;
      vec2 o = vec2(cos(a), sin(a)) * br * rr * px;
      float w = i < 6 ? 1.0 : 0.7;
      acc.r += texture2D(t, uv + o + ca).r * w;
      acc.g += texture2D(t, uv + o).g * w;
      acc.b += texture2D(t, uv + o - ca).b * w;
      wsum += w;
    }
    col = acc / wsum;
  }
  float g = clamp(frost / (30.0 * uDpr), 0.0, 1.0);
  col += (hash(gl_FragCoord.xy * 0.73 + uTime * 1.3) - 0.5) * 0.06 * g * uNoise;
  float inner = -sd;
  col *= 1.0 - 0.16 * uThick * (1.0 - smoothstep(0.0, 1.8 * uDpr, inner));
  float bevel = (inner - 3.0 * uDpr) / (1.2 * uDpr);
  col += 0.06 * uThick * exp(-bevel * bevel);
  float th = 11.0 * uDpr * uThick * n;
  if (th > 0.5) {
    float e = 1.0 - smoothstep(0.0, th, d);
    col = mix(col, col * 0.58, e * 0.85);
    float hl = (d - th * 0.78) / (th * 0.16);
    col += 0.16 * n * uThick * exp(-hl * hl);
  }
  return vec4(col, alpha);
}

void main() {
  vec2 fc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 local = fc - uCard.xy;
  float W = uCard.z;
  float H = uCard.w;
  float s = uDir * (local.x - uFold);
  bool outgoing = s > 0.0;
  float d = abs(s);
  float amp = outgoing ? uAmpA : uAmpB;
  float other = outgoing ? uAmpB : uAmpA;
  vec4 c = outgoing
    ? page(uA, uAspA, local, amp, d, uDir, uSideA)
    : page(uB, uAspB, local, amp, d, -uDir, uSideB);
  float n = uFlare > 0.0 ? amp / uFlare : 0.0;
  float no = uFlare > 0.0 ? other / uFlare : 0.0;
  float k = exp(-d / uFall);
  vec3 col = c.rgb;
  col *= 1.0 - 0.3 * n * exp(-d / (uFall * 0.1));
  float y = clamp(local.y / H, -0.4, 1.4);
  vec3 sheen = mix(vec3(0.42, 0.58, 1.0), vec3(1.0, 0.5, 0.86), smoothstep(0.0, 1.0, y));
  col = mix(col, col + sheen * 0.35, 0.32 * n * k * uGlass);
  col *= 1.0 - 0.3 * no * exp(-d / (uFall * 0.55));
  float sdb = sdRound(local - vec2(W, H) * 0.5 - vec2(0.0, 16.0 * uDpr), vec2(W, H) * 0.5, uRadius);
  float shadow = 0.2 * (1.0 - smoothstep(-10.0 * uDpr, 34.0 * uDpr, sdb));
  float a = c.a + shadow * (1.0 - c.a);
  vec3 outc = col * c.a;
  gl_FragColor = vec4(outc, a);
}
`;

	const smooth = (a: number, b: number, x: number) => {
		const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
		return t * t * (3 - 2 * t);
	};
	const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
	const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

	interface Turn {
		from: number;
		to: number;
		dir: 1 | -1;
		t: number;
	}
</script>

<script lang="ts">
	import { onMount } from 'svelte';

	let {
		images = DEFAULT_IMAGES,
		aspect = 1.5,
		radius = 24,
		flare = 0.34,
		glass = 1,
		blur = 24,
		blurNear = 0.65,
		blurFar = 0.12,
		noise = 0.3,
		thickness = 1,
		duration = 1.3,
		autoplay = true,
		interval = 3.4,
		onChange,
		class: className = ''
	}: DuoFlipProps = $props();

	let rootEl: HTMLDivElement | null = $state(null);
	let stageEl: HTMLDivElement | null = $state(null);
	let canvasEl: HTMLCanvasElement | null = $state(null);

	let index = $state(0);
	let ready = $state(false);
	let failed = $state(false);
	let hold = $state(false);
	let inView = $state(true);
	let seen = $state(false);
	let still = $state(false);
	let entered = $state(false);
	let captionKey = $state(0);

	const n = $derived(images.length);
	const label = $derived(images[index]?.label ?? images[index]?.alt ?? '');
	const captionMargin = $derived(`calc(${(Math.min(0.5, Math.max(0, flare)) * 50) / aspect}% + 12px)`);

	let turn: Turn | null = null;
	let current = 0;
	let api: { draw: () => void } | null = null;
	let rafId = 0;
	let params = {
		flare: Math.min(0.5, Math.max(0, flare)),
		glass,
		blur: Math.max(0, blur),
		blurNear: clamp01(blurNear),
		blurFar: clamp01(blurFar),
		noise: clamp01(noise),
		thickness: Math.min(2, Math.max(0, thickness)),
		radius,
		duration
	};

	$effect(() => {
		params = {
			flare: Math.min(0.5, Math.max(0, flare)),
			glass,
			blur: Math.max(0, blur),
			blurNear: clamp01(blurNear),
			blurFar: clamp01(blurFar),
			noise: clamp01(noise),
			thickness: Math.min(2, Math.max(0, thickness)),
			radius,
			duration
		};
		api?.draw();
	});

	function finish(to: number) {
		current = to;
		turn = null;
		index = to;
		captionKey++;
		onChange?.(to);
		api?.draw();
	}

	function play(target: 0 | 1) {
		const tr = turn;
		if (!tr) return;
		cancelAnimationFrame(rafId);
		const total = Math.max(0.2, params.duration) * 1000;
		const start = performance.now();
		const t0 = tr.t;
		const span = Math.abs(target - t0) * total;
		const step = (now: number) => {
			const k = span <= 0 ? 1 : Math.min(1, (now - start) / span);
			tr.t = t0 + (target - t0) * k;
			api?.draw();
			if (k < 1) rafId = requestAnimationFrame(step);
			else if (target === 1) finish(tr.to);
			else {
				turn = null;
				api?.draw();
			}
		};
		rafId = requestAnimationFrame(step);
	}

	function go(to: number, dir: 1 | -1) {
		if (turn || n < 2) return;
		const from = current;
		if (to === from) return;
		if (still || failed || !ready) {
			finish(to);
			return;
		}
		turn = { from, to, dir, t: 0 };
		play(1);
	}

	function next() {
		go((current + 1) % n, 1);
	}
	function prev() {
		go((current - 1 + n) % n, -1);
	}

	let drag: { x: number; started: boolean } | null = null;

	function onDown(e: PointerEvent) {
		if (e.button !== 0 || turn || n < 2) return;
		drag = { x: e.clientX, started: false };
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
	}
	function onMove(e: PointerEvent) {
		const g = drag;
		if (!g) return;
		const dx = e.clientX - g.x;
		if (!g.started) {
			if (Math.abs(dx) < 6 || still || failed || !ready) return;
			g.started = true;
			const dir: 1 | -1 = dx > 0 ? 1 : -1;
			const from = current;
			turn = { from, to: (from + dir + n) % n, dir, t: 0 };
		}
		const tr = turn;
		if (!tr) return;
		const w = stageEl?.clientWidth ?? 1;
		tr.t = Math.min(1, Math.max(0, (dx * tr.dir) / (w * 0.9)));
		api?.draw();
	}
	function onUp(e: PointerEvent) {
		const g = drag;
		drag = null;
		if (!g) return;
		if (!g.started) {
			if (Math.abs(e.clientX - g.x) < 6) next();
			return;
		}
		const tr = turn;
		if (!tr) return;
		play(tr.t > 0.35 ? 1 : 0);
	}
	function onCancel() {
		const g = drag;
		drag = null;
		if (g?.started && turn) play(0);
	}

	function onKey(e: KeyboardEvent) {
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			next();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			prev();
		}
	}

	onMount(() => {
		still = matchMedia('(prefers-reduced-motion: reduce)').matches;
		entered = true;

		const root = rootEl;
		if (root) {
			const io = new IntersectionObserver(
				([e]) => {
					inView = e.isIntersecting;
					if (e.isIntersecting) seen = true;
				},
				{ threshold: 0.25 }
			);
			io.observe(root);
			const cleanupIo = () => io.disconnect();

			const el = canvasEl;
			const box = stageEl;
			if (!el || !box) {
				return () => {
					cleanupIo();
					cancelAnimationFrame(rafId);
				};
			}

			const gl = el.getContext('webgl', {
				antialias: false,
				premultipliedAlpha: true,
				alpha: true
			});
			if (!gl) {
				failed = true;
				return () => {
					cleanupIo();
					cancelAnimationFrame(rafId);
				};
			}

			const compile = (type: number, src: string) => {
				const s = gl.createShader(type)!;
				gl.shaderSource(s, src);
				gl.compileShader(s);
				return s;
			};
			const prog = gl.createProgram()!;
			gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERTEX));
			gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAGMENT));
			gl.linkProgram(prog);
			if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
				failed = true;
				return () => {
					cleanupIo();
					cancelAnimationFrame(rafId);
				};
			}
			gl.useProgram(prog);
			gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
				gl.STATIC_DRAW
			);
			const loc = gl.getAttribLocation(prog, 'p');
			gl.enableVertexAttribArray(loc);
			gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

			const names = [
				'uRes','uCard','uRadius','uA','uB','uAspA','uAspB','uFold','uDir','uAmpA','uAmpB',
				'uFlare','uGlass','uFall','uDpr','uSideA','uSideB','uTime','uNear','uFar','uNoise','uThick'
			];
			const U = Object.fromEntries(
				names.map((k) => [k, gl.getUniformLocation(prog, k)])
			) as Record<string, WebGLUniformLocation | null>;
			gl.uniform1i(U.uA!, 0);
			gl.uniform1i(U.uB!, 1);

			const textures = images.map(() => {
				const tex = gl.createTexture()!;
				gl.bindTexture(gl.TEXTURE_2D, tex);
				gl.texImage2D(
					gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
					new Uint8Array([228, 228, 225, 255])
				);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				return tex;
			});
			const sizes = images.map(() => ({ w: 1, h: 1 }));
			let alive = true;
			let loaded = 0;

			images.forEach((im, i) => {
				const img = new Image();
				img.crossOrigin = 'anonymous';
				img.decoding = 'async';
				img.onload = () => {
					if (!alive) return;
					gl.bindTexture(gl.TEXTURE_2D, textures[i]!);
					gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
					try {
						gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
						sizes[i] = { w: img.naturalWidth, h: img.naturalHeight };
					} catch {
						/* CORS-blocked */
					}
					loaded++;
					if (i === current || loaded === images.length) ready = true;
					draw();
				};
				img.onerror = () => {
					loaded++;
					if (loaded === images.length) ready = true;
				};
				img.src = im.src;
			});

			const draw = () => {
				const dpr = Math.min(2, window.devicePixelRatio || 1);
				const cw = box.clientWidth;
				const ch = cw / aspect;
				const W = Math.max(1, Math.round((cw + PAD_X * 2) * dpr));
				const H = Math.max(1, Math.round(ch * (1 + PAD_Y * 2) * dpr));
				if (el.width !== W || el.height !== H) {
					el.width = W;
					el.height = H;
				}
				const card = { x: PAD_X * dpr, y: ch * PAD_Y * dpr, w: cw * dpr, h: ch * dpr };
				const p = params;
				const tr = turn;
				const from = tr ? tr.from : current;
				const to = tr ? tr.to : current;
				const t = tr ? tr.t : 0;
				const e = ease(t);
				const dir = tr ? tr.dir : 1;
				const along = -0.18 + 1.36 * e;
				const fold = (dir === 1 ? along : 1 - along) * card.w;
				const handover = smooth(0.42, 0.6, t);
				const ampA = tr ? p.flare * smooth(0, 0.14, t) * (1 - handover) : 0;
				const ampB = tr ? p.flare * handover * (1 - smooth(0.84, 1, t)) : 0;
				const sideA = tr ? p.blur * dpr * smooth(0.04, 0.5, t) : 0;
				const sideB = tr ? p.blur * dpr * smooth(0, 0.08, t) * (1 - smooth(0.18, 0.7, t)) : 0;
				const asp = (i: number) => {
					const ca = card.w / card.h;
					const ia = sizes[i]!.w / sizes[i]!.h;
					return ia > ca ? ([ca / ia, 1] as const) : ([1, ia / ca] as const);
				};
				gl.viewport(0, 0, W, H);
				gl.clearColor(0, 0, 0, 0);
				gl.clear(gl.COLOR_BUFFER_BIT);
				gl.uniform2f(U.uRes!, W, H);
				gl.uniform4f(U.uCard!, card.x, card.y, card.w, card.h);
				gl.uniform1f(U.uRadius!, p.radius * dpr);
				gl.uniform1f(U.uFold!, tr ? fold : -1e5 * dir);
				gl.uniform1f(U.uDir!, dir);
				gl.uniform1f(U.uAmpA!, ampA);
				gl.uniform1f(U.uAmpB!, ampB);
				gl.uniform1f(U.uFlare!, Math.max(0.0001, p.flare));
				gl.uniform1f(U.uGlass!, p.glass);
				gl.uniform1f(U.uFall!, card.w * 0.11);
				gl.uniform1f(U.uDpr!, dpr);
				gl.uniform1f(U.uSideA!, sideA);
				gl.uniform1f(U.uSideB!, sideB);
				gl.uniform1f(U.uNear!, p.blurNear);
				gl.uniform1f(U.uFar!, p.blurFar);
				gl.uniform1f(U.uNoise!, p.noise);
				gl.uniform1f(U.uThick!, p.thickness);
				gl.uniform1f(U.uTime!, (performance.now() / 1000) % 100);
				const [ax, ay] = asp(from);
				const [bx, by] = asp(to);
				gl.uniform2f(U.uAspA!, ax, ay);
				gl.uniform2f(U.uAspB!, bx, by);
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, textures[from]!);
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, textures[to]!);
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			};

			api = { draw };
			draw();
			const ro = new ResizeObserver(draw);
			ro.observe(box);

			return () => {
				alive = false;
				cleanupIo();
				cancelAnimationFrame(rafId);
				ro.disconnect();
				api = null;
				textures.forEach((t) => gl.deleteTexture(t));
				gl.deleteProgram(prog);
			};
		}

		return () => cancelAnimationFrame(rafId);
	});

	$effect(() => {
		if (!autoplay || still || hold || !inView || n < 2) return;
		const id = window.setInterval(
			() => {
				if (!document.hidden) next();
			},
			Math.max(1, interval) * 1000 + Math.max(0.2, duration) * 1000
		);
		return () => window.clearInterval(id);
	});
</script>

<div
	bind:this={rootEl}
	role="region"
	aria-roledescription="carousel"
	aria-label="Pictures"
	tabindex="0"
	class={['duo', className].filter(Boolean).join(' ')}
	class:is-in={entered || still}
	onkeydown={onKey}
	onpointerenter={(e) => e.pointerType === 'mouse' && (hold = true)}
	onpointerleave={(e) => e.pointerType === 'mouse' && (hold = false)}
	onfocus={() => (hold = true)}
	onblur={(e) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) hold = false;
	}}
>
	<div
		bind:this={stageEl}
		class="duo__stage"
		style:aspect-ratio={String(aspect)}
		onpointerdown={onDown}
		onpointermove={onMove}
		onpointerup={onUp}
		onpointercancel={onCancel}
	>
		{#if !ready || failed}
			<img
				src={images[index]?.src}
				alt=""
				draggable="false"
				class="duo__fallback"
				style:border-radius="{radius}px"
			/>
		{/if}
		<canvas
			bind:this={canvasEl}
			aria-hidden="true"
			class="duo__canvas"
			style:left="{-PAD_X}px"
			style:width="calc(100% + {PAD_X * 2}px)"
			style:top="{-PAD_Y * 100}%"
			style:height="{(1 + PAD_Y * 2) * 100}%"
			style:opacity={ready && !failed ? 1 : 0}
		></canvas>
		<span role="img" aria-label={images[index]?.alt} class="sr-only"></span>
	</div>

	<div class="duo__bar" style:margin-top={captionMargin}>
		<div class="duo__meta">
			<span class="duo__count"
				>{String(index + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span
			>
			<span class="duo__caption-wrap">
				{#key captionKey}
					<span class="duo__caption" class:still>{label}</span>
				{/key}
			</span>
		</div>
		<div class="duo__nav">
			<button type="button" class="duo__btn" aria-label="Previous picture" onclick={prev}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
					><path d="M15 18l-6-6 6-6" /></svg
				>
			</button>
			<button type="button" class="duo__btn" aria-label="Next picture" onclick={next}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
					><path d="M9 18l6-6-6-6" /></svg
				>
			</button>
		</div>
	</div>
	<span role="status" aria-live="polite" class="sr-only">
		{images[index]?.alt ?? ''}, {index + 1} of {n}
	</span>
</div>

<style>
	.duo {
		position: relative;
		width: 600px;
		max-width: 100%;
		user-select: none;
		border-radius: 28px;
		outline: none;
		opacity: 0;
		transform: translateY(18px);
		filter: blur(6px);
		transition:
			opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
			transform 0.7s cubic-bezier(0.22, 1, 0.36, 1),
			filter 0.7s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.duo.is-in {
		opacity: 1;
		transform: none;
		filter: none;
	}
	.duo:focus-visible {
		box-shadow: 0 0 0 2px #a1a1aa;
	}
	.duo__stage {
		position: relative;
		width: 100%;
		cursor: pointer;
		touch-action: pan-y;
	}
	.duo__fallback {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		box-shadow: 0 18px 40px -20px rgba(0, 0, 0, 0.35);
	}
	.duo__canvas {
		position: absolute;
		pointer-events: none;
		transition: opacity 0.35s ease;
	}
	.duo__bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 0 4px;
	}
	.duo__meta {
		display: flex;
		min-width: 0;
		align-items: baseline;
		gap: 10px;
	}
	.duo__count {
		flex-shrink: 0;
		font-size: 12px;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		color: #a1a1aa;
	}
	.duo__caption-wrap {
		position: relative;
		min-width: 0;
		overflow: hidden;
	}
	.duo__caption {
		display: block;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 14px;
		font-weight: 500;
		color: #242423;
		animation: duo-cap 0.35s cubic-bezier(0.22, 1, 0.36, 1);
	}
	:global(.dark) .duo__caption,
	:global([data-theme='dark']) .duo__caption {
		color: #f4f4f5;
	}
	.duo__caption.still {
	animation: none;
	}
	@keyframes duo-cap {
		from {
			opacity: 0;
			transform: translateY(12px);
			filter: blur(4px);
		}
		to {
			opacity: 1;
			transform: none;
			filter: none;
		}
	}
	.duo__nav {
		display: flex;
		flex-shrink: 0;
		gap: 6px;
	}
	.duo__btn {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		padding: 0;
		border: 0;
		border-radius: 999px;
		background: rgba(36, 36, 35, 0.06);
		color: #242423;
		cursor: pointer;
		transition: background 0.2s ease, transform 0.15s ease;
	}
	.duo__btn:hover {
		background: rgba(36, 36, 35, 0.1);
		transform: scale(1.06);
	}
	.duo__btn:active {
		transform: scale(0.9);
	}
	:global(.dark) .duo__btn,
	:global([data-theme='dark']) .duo__btn {
		background: rgba(255, 255, 255, 0.08);
		color: #f4f4f5;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
	@media (prefers-reduced-motion: reduce) {
		.duo {
			opacity: 1;
			transform: none;
			filter: none;
			transition: none;
		}
		.duo__caption,
		.duo__btn {
			animation: none;
			transition: none;
		}
		.duo__btn:hover,
		.duo__btn:active {
			transform: none;
		}
	}
</style>
