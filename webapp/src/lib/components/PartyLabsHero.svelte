<script module lang="ts">
	export type Spot = [number, number, number, number, 1?];
	type LayoutName = 'desktop' | 'tablet' | 'mobile';
	type Layout = { u: number; max: number; cards: Spot[] };

	const LAYOUTS: Record<LayoutName, Layout> = {
		desktop: {
			u: 0.092,
			max: 150,
			cards: [
				[15, 6, 0.5, -12], [8, 26, 1, 8], [25, 20, 0.8, 15], [42, 22, 0.28, -10, 1], [59, 6, 0.32, 10],
				[70, 18, 0.6, -14], [83, 27, 0.85, -10], [98, 27, 1, -12], [94, 4, 0.5, 10], [19, 42, 0.3, 6],
				[5, 50, 0.9, 4], [20, 66, 0.42, 8], [7, 74, 0.75, -15], [39, 82, 0.3, -18, 1], [27, 88, 0.55, 10],
				[12, 96, 0.3, -12], [53, 92, 0.36, 0, 1], [64, 82, 0.5, 15], [81, 82, 0.72, -10], [87, 59, 0.85, 8],
				[88, 36, 0.68, -6], [99, 51, 0.9, 12, 1], [97, 75, 0.8, 10], [74, 66, 0.26, -12], [76, 40, 0.26, 8],
				[91, 95, 0.42, -10], [68, 98, 0.3, 8, 1]
			]
		},
		tablet: {
			u: 0.15,
			max: 140,
			cards: [
				[10, 15, 0.9, -10], [30, 12, 0.38, 8, 1], [52, 19, 0.58, -6], [74, 13, 0.85, 12], [94, 25, 0.7, -8],
				[20, 29, 0.42, 10], [80, 32, 0.38, -12, 1], [4, 45, 0.58, 6], [97, 50, 0.58, -8], [6, 63, 0.4, -10, 1],
				[12, 79, 0.85, 10], [33, 73, 0.33, -8], [51, 87, 0.58, 6, 1], [70, 76, 0.4, 12], [88, 83, 0.9, -10],
				[28, 94, 0.5, -6], [78, 96, 0.44, 8], [96, 67, 0.33, 10]
			]
		},
		mobile: {
			u: 0.27,
			max: 130,
			cards: [
				[14, 15, 0.85, -10], [45, 12, 0.38, 8, 1], [82, 15, 0.9, 10], [28, 27, 0.48, 6], [66, 28, 0.52, -12],
				[97, 31, 0.33, 8], [3, 31, 0.33, -8, 1], [12, 77, 0.85, 10], [48, 79, 0.38, -8, 1], [85, 76, 0.8, -10],
				[30, 91, 0.52, 8], [70, 93, 0.58, 10], [97, 89, 0.33, -6]
			]
		}
	};

	const PHOTOS: { src: string; p: boolean }[] = [
		{ src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc8?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1485872299829-c673f5194813?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1566417713940-ae1151d5e4ef?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1574391884720-bbc3740c59d1?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1571266028247-e6736259ff6d?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1545128485-c400e7702790?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1566737236501-c4e505a7c2e8?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1478144592103-25e218a04891?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1525268323446-0505ab402c48?w=600&q=80', p: true },
		{ src: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1519677100203-a0e668c92439?w=500&q=80', p: false },
		{ src: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=500&q=80', p: false }
	];

	function assignPhotos(cards: Spot[]): string[] {
		const used = new Set<number>();
		const out: string[] = [];
		cards
			.map((c, i) => ({ c, i }))
			.sort((a, b) => b.c[2] - a.c[2])
			.forEach(({ c, i }) => {
				const want = c[4] === 1;
				let pick = PHOTOS.findIndex((ph, k) => !used.has(k) && ph.p === want);
				if (pick < 0) pick = PHOTOS.findIndex((_, k) => !used.has(k));
				if (pick < 0) pick = 0;
				used.add(pick);
				out[i] = PHOTOS[pick].src;
			});
		return out;
	}

	function pickLayout(w: number, h: number): LayoutName {
		if (w < 640) return 'mobile';
		if (w < 1024 || h > w * 1.05) return 'tablet';
		return 'desktop';
	}

	const IDEAS = [
		'rooftop bars in Bandra',
		'birthday venues for 30',
		'live music tonight',
		'private dining rooms',
		'sundowners by the sea'
	];

	const TITLE = 'Connecting you to experiences';
	const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
</script>

<script lang="ts">
	/**
	 * PartyLabs Hero — thesis in a 3-D field of party photos (Svelte 5, no motion).
	 */
	import { onMount } from 'svelte';
	import './partylabs-hero.css';

	let heroEl = $state<HTMLElement | null>(null);
	let fieldEl = $state<HTMLDivElement | null>(null);
	let menuEl = $state<HTMLButtonElement | null>(null);
	let sheetEl = $state<HTMLDivElement | null>(null);

	let layout = $state<LayoutName | null>(null);
	let idea = $state(0);
	let sheet = $state(false);
	let searchValue = $state('');
	let reduce = $state(false);
	let firstBuild = true;

	type CardView = {
		x: number;
		y: number;
		d: number;
		r: number;
		portrait: boolean;
		src: string;
		order: number;
		i: number;
	};

	const cards = $derived.by((): CardView[] => {
		if (!layout) return [];
		const L = LAYOUTS[layout];
		const photos = assignPhotos(L.cards);
		return L.cards
			.map((c, i) => ({
				x: c[0],
				y: c[1],
				d: c[2],
				r: c[3],
				portrait: c[4] === 1,
				src: photos[i],
				i,
				dist: Math.hypot(c[0] - 50, (c[1] - 50) * 1.3)
			}))
			.sort((a, b) => a.dist - b.dist)
			.map((o, order) => ({ ...o, order }));
	});

	const titleWords = TITLE.split(' ');

	onMount(() => {
		reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const hero = heroEl;
		const field = fieldEl;
		if (!hero || !field) return;

		let t = 0;
		const fit = () => {
			const w = hero.clientWidth;
			const h = hero.clientHeight;
			const name = pickLayout(w, h);
			const L = LAYOUTS[name];
			const unit = Math.min(w * L.u, L.max) * Math.max(0.72, Math.min(1.1, h / 860));
			field.style.setProperty('--plh-unit', `${unit.toFixed(1)}px`);
			layout = name;
		};
		fit();
		const ro = new ResizeObserver(() => {
			clearTimeout(t);
			t = window.setTimeout(fit, 120);
		});
		ro.observe(hero);

		const ideaTimer = reduce
			? undefined
			: setInterval(() => {
					idea = (idea + 1) % IDEAS.length;
				}, 2800);

		const onKey = (e: KeyboardEvent) => {
			const typing =
				document.activeElement instanceof HTMLInputElement ||
				document.activeElement instanceof HTMLTextAreaElement;
			if (e.key === '/' && !typing) {
				e.preventDefault();
				if ((hero.clientWidth ?? innerWidth) >= 768) {
					document.getElementById('plh-q')?.focus();
				} else {
					sheet = true;
					requestAnimationFrame(() => document.getElementById('plh-q2')?.focus());
				}
			}
			if (e.key === 'Escape') sheet = false;
		};
		addEventListener('keydown', onKey);

		return () => {
			clearTimeout(t);
			ro.disconnect();
			if (ideaTimer) clearInterval(ideaTimer);
			removeEventListener('keydown', onKey);
		};
	});

	$effect(() => {
		const field = fieldEl;
		const list = cards;
		if (!field || !list.length || reduce) return;
		const first = firstBuild;
		firstBuild = false;
		const w = field.clientWidth;
		const h = field.clientHeight;
		const controls = Array.from(field.querySelectorAll<HTMLElement>('.plh-photo')).map((el) => {
			const x = +(el.dataset.x ?? 50);
			const y = +(el.dataset.y ?? 50);
			const order = +(el.dataset.order ?? 0);
			return el.animate(
				[
					{
						opacity: 0,
						transform: `translate(${(((50 - x) * 0.6 * w) / 100) * 0.35}px, ${(((50 - y) * 0.6 * h) / 100) * 0.35}px) scale(0.55)`,
						filter: 'blur(10px)'
					},
					{ opacity: 1, transform: 'translate(0,0) scale(1)', filter: 'blur(0px)' }
				],
				{
					duration: first ? 1400 : 800,
					delay: (first ? 350 : 0) + order * 35,
					easing: EASE,
					fill: 'forwards'
				}
			);
		});
		return () => controls.forEach((c) => c.cancel());
	});

	$effect(() => {
		const field = fieldEl;
		if (!field || reduce) return;
		if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		let tx = 0, ty = 0, mx = 0, my = 0, raf = 0;
		const move = (e: PointerEvent) => {
			const r = field.getBoundingClientRect();
			tx = (e.clientX - r.left) / r.width - 0.5;
			ty = (e.clientY - r.top) / r.height - 0.5;
		};
		const leave = () => { tx = 0; ty = 0; };
		const loop = () => {
			mx += (tx - mx) * 0.06;
			my += (ty - my) * 0.06;
			field.style.setProperty('--plh-mx', mx.toFixed(4));
			field.style.setProperty('--plh-my', my.toFixed(4));
			raf = requestAnimationFrame(loop);
		};
		addEventListener('pointermove', move, { passive: true });
		document.documentElement.addEventListener('pointerleave', leave);
		raf = requestAnimationFrame(loop);
		return () => {
			removeEventListener('pointermove', move);
			document.documentElement.removeEventListener('pointerleave', leave);
			cancelAnimationFrame(raf);
		};
	});

	$effect(() => {
		if (!sheet) return;
		const away = (e: PointerEvent) => {
			const t = e.target as Node;
			if (!sheetEl?.contains(t) && !menuEl?.contains(t)) sheet = false;
		};
		document.addEventListener('pointerdown', away);
		return () => document.removeEventListener('pointerdown', away);
	});

	function cardStyle(c: CardView): string {
		const portrait = c.portrait;
		const d = c.d;
		const o = (0.28 + d * 0.72).toFixed(2);
		const b = d < 0.6 ? ((0.6 - d) * 6).toFixed(1) : '0';
		const s = (0.55 + d * 0.5).toFixed(2);
		const z = Math.round(d * 10);
		const dur = 7 + (c.i % 5) * 1.3;
		const delay = -(c.i * 0.7);
		const amp = (4 + d * 7).toFixed(1);
		const w = ((0.55 + d * 0.65) * (portrait ? 0.82 : 1)).toFixed(3);
		return [
			`--x:${c.x}%`, `--y:${c.y}%`, `--d:${d}`, `--r:${c.r}deg`,
			`--ar:${portrait ? '3 / 4' : '4 / 3'}`, `--o:${o}`, `--b:${b}px`, `--s:${s}`,
			`--z:${z}`, `--dur:${dur}s`, `--delay:${delay.toFixed(1)}s`, `--amp:${amp}px`,
			`--w:calc(var(--plh-unit) * ${w})`
		].join(';');
	}
</script>

<main bind:this={heroEl} class="plh" id="plh-top">
	<div bind:this={fieldEl} class="plh-field" aria-hidden="true">
		{#each cards as c (layout + '-' + c.i)}
			<div class="plh-card" class:is-near={c.d > 0.65} style={cardStyle(c)}>
				<div class="plh-float">
					<div
						class="plh-photo"
						data-x={c.x}
						data-y={c.y}
						data-order={c.order}
						style={reduce ? undefined : 'opacity:0'}
					>
						<img
							alt=""
							src={c.src}
							decoding="async"
							draggable="false"
							fetchpriority={c.d > 0.65 ? 'high' : 'auto'}
						/>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<header class="plh-nav">
		<a class="plh-brand plh-nav-anim" href="#plh-top" aria-label="iPartyLabs home" style="animation-delay:0.45s" onclick={(e) => e.preventDefault()}>
			<span class="plh-brand__mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
			iPartyLabs
		</a>

		<div class="plh-nav__search plh-nav-anim" style="animation-delay:0.5s">
			<form class="plh-search" class:is-filled={!!searchValue} role="search" onsubmit={(e) => e.preventDefault()}>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<circle cx="11" cy="11" r="7"></circle>
					<path d="m20 20-3.5-3.5"></path>
				</svg>
				<label class="plh-sr" for="plh-q">Search venues and experiences</label>
				<div class="plh-search__field">
					<input id="plh-q" name="q" type="search" autocomplete="off" bind:value={searchValue} />
					<div class="plh-search__hint" aria-hidden="true">
						<b>Try</b>
						<span class="plh-search__words">
							{#key idea}<span class="plh-search__word">{IDEAS[idea]}</span>{/key}
						</span>
					</div>
				</div>
				<span class="plh-kbd" aria-hidden="true">/</span>
			</form>
		</div>

		<nav class="plh-nav__right" aria-label="Primary">
			<a class="plh-nav__link plh-nav-anim" href="#plh-top" aria-current="page" style="animation-delay:0.55s" onclick={(e) => e.preventDefault()}>Home</a>
			<a class="plh-nav__link plh-nav-anim" href="#plh-top" style="animation-delay:0.6s" onclick={(e) => e.preventDefault()}>Partner</a>
			<button class="plh-icon plh-nav-anim" type="button" aria-label="Cart" style="animation-delay:0.65s">
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M3 4h2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L21 8H6.2"></path>
					<circle cx="9.5" cy="20" r="1.2"></circle>
					<circle cx="17" cy="20" r="1.2"></circle>
				</svg>
			</button>
			<button class="plh-btn plh-btn--dark plh-btn--sm plh-nav-anim" type="button" style="animation-delay:0.7s">Logout</button>
			<button
				bind:this={menuEl}
				class="plh-icon plh-menu plh-nav-anim"
				type="button"
				aria-label={sheet ? 'Close menu' : 'Open menu'}
				aria-expanded={sheet}
				aria-controls="plh-sheet"
				style="animation-delay:0.5s"
				onclick={() => (sheet = !sheet)}
			>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
					<path d="M4 8h16"></path>
					<path d="M4 16h16"></path>
				</svg>
			</button>
		</nav>
	</header>

	{#if sheet}
		<div bind:this={sheetEl} id="plh-sheet" class="plh-sheet">
			<form class="plh-search" class:is-filled={!!searchValue} role="search" onsubmit={(e) => e.preventDefault()}>
				<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
					<circle cx="11" cy="11" r="7"></circle>
					<path d="m20 20-3.5-3.5"></path>
				</svg>
				<label class="plh-sr" for="plh-q2">Search venues</label>
				<div class="plh-search__field">
					<input id="plh-q2" name="q" type="search" autocomplete="off" bind:value={searchValue} />
					<div class="plh-search__hint" aria-hidden="true">
						<b>Try</b>
						<span class="plh-search__words">{#key idea}<span class="plh-search__word">{IDEAS[idea]}</span>{/key}</span>
					</div>
				</div>
			</form>
			<a href="#plh-top" aria-current="page" onclick={(e) => e.preventDefault()}>Home</a>
			<a href="#plh-top" onclick={(e) => e.preventDefault()}>Partner</a>
			<button class="plh-btn plh-btn--dark" type="button">Logout</button>
		</div>
	{/if}

	<section class="plh-content" aria-labelledby="plh-title">
		<a class="plh-badge" href="#plh-top" onclick={(e) => e.preventDefault()}>
			<span class="plh-badge__icon" aria-hidden="true"><span><i></i><i></i><i></i><i></i></span></span>
			Announcing our Launch
			<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="m9 6 6 6-6 6"></path>
			</svg>
		</a>

		<h1 id="plh-title" class="plh-title" aria-label={TITLE}>
			{#each titleWords as w, i}
				<span class="plh-title__w" style="--i:{i}" aria-hidden="true">{w}</span>
			{/each}
		</h1>

		<div class="plh-ctas">
			<a class="plh-btn plh-btn--dark" href="#plh-top" onclick={(e) => e.preventDefault()}>
				Browse Venues
				<svg class="plh-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M5 12h14M13 6l6 6-6 6"></path>
				</svg>
			</a>
			<a class="plh-btn plh-btn--light" href="#plh-top" onclick={(e) => e.preventDefault()}>Contact Us</a>
		</div>
	</section>
</main>
