<script lang="ts">
	/**
	 * Swap Card — token swap UI. Svelte 5 port (CSS + WAAPI, no motion/react).
	 * Full source also in artifacts/SwapCard.svelte
	 */
	import { onMount } from 'svelte';
	import './swap-card.css';

	export type SwapCardToken = {
		symbol: string;
		name: string;
		price: number;
		change: number;
		color: string;
	};

	export type SwapCardProps = {
		theme?: 'light' | 'dark';
		onSwap?: (trade: {
			mode: 'Swap' | 'Buy' | 'Stake';
			pay: string;
			receive: string;
			amount: number;
			received: number;
		}) => void;
	};

	type Mode = 'Swap' | 'Buy' | 'Stake';
	type Side = 'pay' | 'receive';
	type Status = 'idle' | 'pending' | 'done';

	export const SWAP_CARD_TOKENS: SwapCardToken[] = [
		{ symbol: 'USDT', name: 'Tether USD', price: 1, change: -0.45, color: '#26a17b' },
		{ symbol: 'ETH', name: 'Ethereum', price: 3260.2, change: -0.45, color: '#627eea' },
		{ symbol: 'USDC', name: 'USD Coin', price: 1, change: 0.01, color: '#2775ca' },
		{ symbol: 'BTC', name: 'Bitcoin', price: 67420, change: 1.12, color: '#f7931a' },
		{ symbol: 'DAI', name: 'Dai', price: 1, change: -0.02, color: '#f5ac37' },
		{ symbol: 'USD', name: 'US Dollar', price: 1, change: 0, color: '#1f9d55' },
		{ symbol: 'stETH', name: 'Lido Staked ETH', price: 3255.4, change: -0.51, color: '#00a3ff' }
	];

	const tokens = SWAP_CARD_TOKENS;
	const bySymbol = (symbol: string) => tokens.find((t) => t.symbol === symbol)!;

	const modes: Record<Mode, { pay: string; receive: string; amount: string; doing: string; done: string }> = {
		Swap: { pay: 'USDT', receive: 'ETH', amount: '164.23', doing: 'Swapping', done: 'Swapped' },
		Buy: { pay: 'USD', receive: 'ETH', amount: '250', doing: 'Buying', done: 'Bought' },
		Stake: { pay: 'ETH', receive: 'stETH', amount: '', doing: 'Staking', done: 'Staked' }
	};

	let { theme = 'light', onSwap }: SwapCardProps = $props();

	let mode = $state<Mode>('Swap');
	let pay = $state(modes.Swap.pay);
	let receive = $state(modes.Swap.receive);
	let amount = $state(modes.Swap.amount);
	let balances = $state<Record<string, number>>({
		USDT: 4537.5, ETH: 0, USDC: 1250, BTC: 0, DAI: 0, USD: 10000, stETH: 0
	});
	let flips = $state(0);
	let picker = $state<Side | null>(null);
	let details = $state(false);
	let status = $state<Status>('idle');
	let bursts = $state(0);
	let ripples = $state<{ id: number; x: number; y: number }[]>([]);
	let btnHover = $state(false);
	let glowX = $state(-200);
	let glowY = $state(-200);
	let nextRippleId = 0;
	let lastFlip: { shown: string; typed: string } | null = null;
	const timers: number[] = [];
	let btnEl: HTMLButtonElement | null = null;
	let tabEls: (HTMLButtonElement | null)[] = [];
	let tabPillStyle = $state('left:0;width:0');

	const payT = $derived(bySymbol(pay));
	const receiveT = $derived(bySymbol(receive));
	const value = $derived(parseFloat(amount) || 0);
	const rate = $derived(payT.price / receiveT.price);
	const out = $derived(value * rate);
	const preset = $derived(mode === 'Swap' && pay === 'USDT' && receive === 'ETH' && amount === modes.Swap.amount);
	const outText = $derived(preset ? '0.0505' : fmtOut(out));
	const payUsd = $derived(preset ? 64.23 : value * payT.price);
	const receiveUsd = $derived(preset ? 64.23 : out * receiveT.price);
	const insufficient = $derived(value > balances[pay] + 1e-9);
	const ready = $derived(value > 0 && !insufficient && status === 'idle');

	const label = $derived(
		status === 'pending'
			? `${modes[mode].doing}…`
			: status === 'done'
				? modes[mode].done
				: value === 0
					? 'Enter an amount'
					: insufficient
						? `Insufficient ${pay}`
						: mode
	);

	const amountFont = $derived(amount.length <= 7 ? 38 : amount.length <= 9 ? 32 : amount.length <= 11 ? 27 : 22);
	const outFont = $derived(('~' + outText).length <= 7 ? 38 : ('~' + outText).length <= 9 ? 32 : ('~' + outText).length <= 11 ? 27 : 22);

	const burstAngles = Array.from({ length: 14 }, (_, i) => {
		const angle = (i / 14) * Math.PI * 2;
		const reach = 1 + (i % 3) * 0.22;
		return { x: Math.cos(angle) * 190 * reach, y: Math.sin(angle) * 44 * reach, size: 3 + (i % 3) };
	});

	const blobs = [
		{ w: 120, h: 60, top: -16, dur: 5.5, delay: 0, color: 'rgb(170 225 255 / 0.95)' },
		{ w: 95, h: 50, top: 8, dur: 7, delay: -2.5, color: 'rgb(125 205 255 / 0.85)' },
		{ w: 135, h: 68, top: -6, dur: 8.5, delay: -5, color: 'rgb(200 238 255 / 0.7)' }
	];
	const sparks = Array.from({ length: 14 }, (_, i) => ({
		left: (i * 37) % 100,
		top: 18 + ((i * 53) % 64),
		dur: 1.6 + (i % 5) * 0.35,
		delay: (i * 0.29) % 2
	}));

	function usd(v: number) {
		return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	}
	function fmtOut(v: number) {
		if (v === 0) return '0';
		if (v >= 1000) return v.toLocaleString('en-US', { maximumFractionDigits: 2 });
		if (v >= 1) return v.toLocaleString('en-US', { maximumFractionDigits: 4 });
		return v.toLocaleString('en-US', { maximumSignificantDigits: 3 });
	}
	function fmtRate(r: number) {
		if (r >= 1000) return r.toLocaleString('en-US', { maximumFractionDigits: 2 });
		if (r >= 1) return r.toLocaleString('en-US', { maximumFractionDigits: 4 });
		return r.toLocaleString('en-US', { maximumSignificantDigits: 5 });
	}
	function fmtBalance(v: number) {
		if (v === 0) return 'none';
		return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: v < 1 ? 6 : 2 });
	}
	const toInput = (v: number) => (v > 0 ? String(Number(v.toFixed(8))) : '');
	function sanitize(raw: string) {
		let s = raw.replace(',', '.').replace(/[^\d.]/g, '');
		const dot = s.indexOf('.');
		if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '').slice(0, 8);
		if (s.startsWith('.')) s = '0' + s;
		return s.replace(/^0+(?=\d)/, '');
	}

	function updateTabPill() {
		const modesList = Object.keys(modes) as Mode[];
		const idx = modesList.indexOf(mode);
		const el = tabEls[idx];
		if (!el) return;
		tabPillStyle = `left:${el.offsetLeft}px;width:${el.offsetWidth}px`;
	}

	function switchMode(next: Mode) {
		if (next === mode || status === 'pending') return;
		clearTimers();
		status = 'idle';
		mode = next;
		pay = modes[next].pay;
		receive = modes[next].receive;
		amount = modes[next].amount;
		picker = null;
		queueMicrotask(updateTabPill);
	}

	function flip() {
		if (status === 'pending') return;
		const prevPay = pay;
		pay = receive;
		receive = prevPay;
		const next = lastFlip?.shown === amount ? lastFlip.typed : toInput(out);
		lastFlip = { shown: next, typed: amount };
		amount = next;
		flips += 1;
		picker = null;
	}

	function pick(side: Side, symbol: string) {
		picker = null;
		const other = side === 'pay' ? receive : pay;
		if (symbol === other) return flip();
		if (side === 'pay') pay = symbol;
		else receive = symbol;
	}

	function clearTimers() {
		timers.forEach(clearTimeout);
		timers.length = 0;
	}

	function submit() {
		if (!ready) return;
		status = 'pending';
		timers.push(
			window.setTimeout(() => {
				balances = {
					...balances,
					[pay]: Math.max(0, balances[pay] - value),
					[receive]: balances[receive] + out
				};
				status = 'done';
				bursts += 1;
				onSwap?.({ mode, pay, receive, amount: value, received: out });
			}, 1200),
			window.setTimeout(() => {
				status = 'idle';
			}, 2600)
		);
	}

	function onBtnClick() {
		if (status === 'pending') return;
		if (!ready) {
			if (btnEl) {
				btnEl.animate(
					[{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' }, { transform: 'translateX(7px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
					{ duration: 420, easing: 'ease-out' }
				);
			}
			return;
		}
		submit();
	}

	function onBtnPointerDown(e: PointerEvent) {
		if (!ready || status !== 'idle') return;
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const id = nextRippleId++;
		ripples = [...ripples, { id, x: e.clientX - r.left, y: e.clientY - r.top }];
		setTimeout(() => {
			ripples = ripples.filter((x) => x.id !== id);
		}, 800);
	}

	function onBtnMove(e: PointerEvent) {
		const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
		glowX = e.clientX - r.left;
		glowY = e.clientY - r.top;
	}

	function glyph(symbol: string): string {
		switch (symbol) {
			case 'USDT':
				return `<g fill="#fff"><path d="M8.5 8.6h15v3.3h-5.6v11.6h-3.8V11.9H8.5z"/><ellipse cx="16" cy="15.4" rx="7.4" ry="1.9" fill="none" stroke="#fff" stroke-width="1.5"/></g>`;
			case 'ETH':
			case 'stETH':
				return `<g fill="#fff"><path d="M16 5.5v7.8l6.6 2.9z" fill-opacity=".6"/><path d="M16 5.5 9.4 16.2l6.6-2.9z"/><path d="M16 21.3v5.2l6.6-9.2z" fill-opacity=".6"/><path d="M16 26.5v-5.2l-6.6-4z"/><path d="M16 20.1l6.6-3.9L16 13.3z" fill-opacity=".2"/><path d="M9.4 16.2l6.6 3.9v-6.8z" fill-opacity=".6"/></g>`;
			case 'BTC':
				return `<text x="16" y="22" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="system-ui">₿</text>`;
			case 'DAI':
				return `<text x="16" y="21.5" text-anchor="middle" font-size="14" font-weight="800" fill="#fff" font-family="system-ui">D</text>`;
			default:
				return `<text x="16" y="22" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="system-ui">$</text>`;
		}
	}

	onMount(() => {
		updateTabPill();
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') picker = null;
		};
		const onDown = (e: PointerEvent) => {
			const t = e.target as Node;
			if (!(t instanceof Element) || !t.closest('.pswap__select')) picker = null;
		};
		window.addEventListener('keydown', onKey);
		window.addEventListener('pointerdown', onDown);
		return () => {
			clearTimers();
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('pointerdown', onDown);
		};
	});

	$effect(() => {
		mode;
		queueMicrotask(updateTabPill);
	});
</script>

<div class="pswap" data-theme={theme}>
	<div class="pswap__card">
		<div class="pswap__tabsRow">
			<div role="tablist" aria-label="Action" class="pswap__tabs">
				<span class="pswap__tabPill" style={tabPillStyle} aria-hidden="true"></span>
				{#each Object.keys(modes) as m, i}
					<button
						type="button"
						role="tab"
						class="pswap__tab"
						aria-selected={m === mode}
						bind:this={tabEls[i]}
						onclick={() => switchMode(m as Mode)}
					>
						<span class="pswap__tabText">{m}</span>
					</button>
				{/each}
			</div>
		</div>

		<div class="pswap__slot" data-raised={picker === 'pay' || undefined}>
			<section class="pswap__panel">
				<h2 class="pswap__panelLabel">Pay</h2>
				<div class="pswap__row">
					<input
						class="pswap__amount pswap__input"
						aria-label="Pay amount"
						inputmode="decimal"
						autocomplete="off"
						placeholder="0"
						value={amount}
						oninput={(e) => (amount = sanitize(e.currentTarget.value))}
						style:font-size="{amountFont}px"
					/>
					<div class="pswap__select">
						<button type="button" class="pswap__pill" aria-haspopup="listbox" aria-expanded={picker === 'pay'} onclick={() => (picker = picker === 'pay' ? null : 'pay')}>
							<span class="pswap__pillToken">
								<svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" class="pswap__coin">
									<circle cx="16" cy="16" r="16" fill={payT.color} />
									{@html glyph(payT.symbol)}
								</svg>
								{payT.symbol}
							</span>
							<span class="pswap__pillChevron" data-open={picker === 'pay' || undefined}>
								<svg class="pswap__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
							</span>
						</button>
						{#if picker === 'pay'}
							<ul class="pswap__list" role="listbox" aria-label="Select token">
								{#each tokens as t}
									<li>
										<button type="button" role="option" aria-selected={t.symbol === pay} class="pswap__option" onclick={() => pick('pay', t.symbol)}>
											<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" class="pswap__coin"><circle cx="16" cy="16" r="16" fill={t.color} />{@html glyph(t.symbol)}</svg>
											<span class="pswap__optionName"><span class="pswap__optionSymbol">{t.symbol}</span><span class="pswap__optionFull">{t.name}</span></span>
											<span class="pswap__optionBalance">{balances[t.symbol] ? fmtBalance(balances[t.symbol]) : ''}</span>
											{#if t.symbol === pay}<svg class="pswap__optionCheck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
				<div class="pswap__foot">
					<div><span class="pswap__usd">{usd(payUsd)} <span class="pswap__faint">({payT.change > 0 ? '+' : ''}{payT.change.toFixed(2)}%)</span></span></div>
					<div class="pswap__footRight">You have <span class="pswap__have">{fmtBalance(balances[pay])}</span>
						<button type="button" class="pswap__max" disabled={balances[pay] === 0} onclick={() => (amount = toInput(balances[pay]))}>MAX</button>
					</div>
				</div>
			</section>
		</div>

		<div class="pswap__seam">
			<button type="button" class="pswap__flip" aria-label="Switch pay and receive" onclick={flip}>
				<span class="pswap__flipIcon" style:transform="rotate({flips * 180}deg)">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg>
				</span>
			</button>
		</div>

		<div class="pswap__slot" data-raised={picker === 'receive' || undefined}>
			<section class="pswap__panel">
				<h2 class="pswap__panelLabel">Receive</h2>
				<div class="pswap__row">
					<div class="pswap__amount pswap__out" aria-label="Receive amount" aria-live="polite" data-empty={out === 0 || undefined} style:font-size="{outFont}px">
						<span>~</span><span class="pswap__odometer">{outText}</span>
					</div>
					<div class="pswap__select">
						<button type="button" class="pswap__pill" aria-haspopup="listbox" aria-expanded={picker === 'receive'} onclick={() => (picker = picker === 'receive' ? null : 'receive')}>
							<span class="pswap__pillToken">
								<svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true" class="pswap__coin"><circle cx="16" cy="16" r="16" fill={receiveT.color} />{@html glyph(receiveT.symbol)}</svg>
								{receiveT.symbol}
							</span>
							<span class="pswap__pillChevron" data-open={picker === 'receive' || undefined}>
								<svg class="pswap__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
							</span>
						</button>
						{#if picker === 'receive'}
							<ul class="pswap__list" role="listbox" aria-label="Select token">
								{#each tokens as t}
									<li>
										<button type="button" role="option" aria-selected={t.symbol === receive} class="pswap__option" onclick={() => pick('receive', t.symbol)}>
											<svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true" class="pswap__coin"><circle cx="16" cy="16" r="16" fill={t.color} />{@html glyph(t.symbol)}</svg>
											<span class="pswap__optionName"><span class="pswap__optionSymbol">{t.symbol}</span><span class="pswap__optionFull">{t.name}</span></span>
											<span class="pswap__optionBalance">{balances[t.symbol] ? fmtBalance(balances[t.symbol]) : ''}</span>
											{#if t.symbol === receive}<svg class="pswap__optionCheck" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}
										</button>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
				<div class="pswap__foot">
					<div><span class="pswap__usd">{usd(receiveUsd)} <span class="pswap__faint">({receiveT.change > 0 ? '+' : ''}{receiveT.change.toFixed(2)}%)</span></span></div>
					<div class="pswap__footRight">You have <span class="pswap__have">{fmtBalance(balances[receive])}</span></div>
				</div>
			</section>
		</div>

		<button type="button" class="pswap__rate" aria-expanded={details} onclick={() => (details = !details)}>
			<span class="pswap__rateText">1 {pay} = {fmtRate(rate)} {receive}</span>
			<span class="pswap__rateChevron" data-open={details || undefined}>
				<svg class="pswap__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
			</span>
		</button>

		{#if details}
			<div class="pswap__drawer" data-open="">
				<dl class="pswap__details">
					<div class="pswap__detail"><dt>Price impact</dt><dd>{receiveT.change.toFixed(2)}%</dd></div>
					<div class="pswap__detail"><dt>Minimum received</dt><dd>{fmtOut(out * 0.995)} {receive}</dd></div>
					<div class="pswap__detail"><dt>Slippage tolerance</dt><dd>0.5%</dd></div>
					<div class="pswap__detail"><dt>Network fee</dt><dd>{value > 0 ? '~$2.14' : '—'}</dd></div>
					<div class="pswap__detail"><dt>Route</dt><dd>{pay} → {receive}</dd></div>
				</dl>
			</div>
		{/if}

		<div class="pswap__go">
			{#if bursts > 0}
				{#key bursts}
					<span class="pswap__burst" aria-hidden="true">
						<span class="pswap__burstRing"></span>
						<span class="pswap__burstCore">
							{#each burstAngles as b, i}
								<span class="pswap__speck" style="width:{b.size}px;height:{b.size}px;margin-left:{-b.size / 2}px;margin-top:{-b.size / 2}px;--sx:{b.x}px;--sy:{b.y}px;background:{i % 2 ? '#7cc8ff' : '#4d82ff'}"></span>
							{/each}
						</span>
					</span>
				{/key}
			{/if}

			<button
				type="button"
				class="pswap__button"
				data-state={!ready && status === 'idle' ? 'disabled' : status !== 'idle' ? 'busy' : 'ready'}
				data-hover={btnHover || undefined}
				bind:this={btnEl}
				onclick={onBtnClick}
				onpointerdown={onBtnPointerDown}
				onpointermove={onBtnMove}
				onpointerenter={() => (btnHover = true)}
				onpointerleave={() => (btnHover = false)}
				aria-disabled={!ready && status === 'idle'}
				aria-busy={status !== 'idle'}
			>
				<span class="pswap__water" aria-hidden="true">
					{#each blobs as b, i}
						<span class="pswap__blob" style="width:{b.w}px;height:{b.h}px;top:{b.top}px;left:{-b.w}px;background:radial-gradient(closest-side,{b.color},transparent);animation-duration:{status === 'pending' ? b.dur / 3 : b.dur}s;animation-delay:{status === 'pending' ? i * -0.4 : b.delay}s"></span>
					{/each}
					{#each sparks as s}
						<span class="pswap__spark" style="left:{s.left}%;top:{s.top}%;animation-duration:{s.dur}s;animation-delay:{s.delay}s"></span>
					{/each}
				</span>
				<span class="pswap__glow" style="background:radial-gradient(110px circle at {glowX}px {glowY}px, rgb(255 255 255 / 0.28), transparent 70%)" aria-hidden="true"></span>
				{#if status === 'pending'}<span class="pswap__sweep" aria-hidden="true"></span>{/if}
				{#each ripples as r (r.id)}
					<span class="pswap__ripple" style="left:{r.x - 10}px;top:{r.y - 10}px" aria-hidden="true"></span>
				{/each}
				<span class="pswap__buttonText">
					<span class="pswap__label">
						<span class="pswap__labelInner">
							{#if status === 'pending'}
								<svg class="pswap__spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
							{/if}
							{#if status === 'done'}
								<svg class="pswap__done" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
							{/if}
							{label}
						</span>
					</span>
				</span>
			</button>
		</div>
	</div>
</div>
