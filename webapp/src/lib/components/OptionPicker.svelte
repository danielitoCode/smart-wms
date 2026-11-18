<script lang="ts">
	/**
	 * OptionPicker — compact visibility/segment picker (Private / Public, etc.).
	 * Migrated from React + motion/react to Svelte 5 + CSS (no Motion).
	 *
	 * Uso:
	 *   <OptionPicker options={opts} onChange={(id) => ...} />
	 */
	import type { OptionIcon, OptionItem } from './optionPicker.types';

	interface Props {
		options?: OptionItem[];
		value?: string;
		onChange?: (id: string) => void;
		class?: string;
	}

	const DEFAULT_OPTIONS: OptionItem[] = [
		{ id: 'private', label: 'Private', icon: 'lock' },
		{ id: 'public', label: 'Public', icon: 'globe' }
	];

	let { options, value, onChange, class: className = '' }: Props = $props();

	const data = $derived(options?.length ? options : DEFAULT_OPTIONS);

	let isOpen = $state(false);
	let selectedId = $state<string>('');
	let rootEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		const list = data;
		const fromProp = value && list.some((o) => o.id === value) ? value : null;
		if (fromProp) {
			selectedId = fromProp;
		} else if (!list.some((o) => o.id === selectedId)) {
			selectedId = list[0]?.id ?? '';
		}
	});

	const selected = $derived(data.find((o) => o.id === selectedId) ?? data[0]);

	$effect(() => {
		if (!isOpen || typeof document === 'undefined') return;
		const onDoc = (e: MouseEvent) => {
			if (rootEl && !rootEl.contains(e.target as Node)) isOpen = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') isOpen = false;
		};
		document.addEventListener('mousedown', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('mousedown', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	});

	function toggle() {
		isOpen = !isOpen;
	}

	function select(opt: OptionItem) {
		selectedId = opt.id;
		isOpen = false;
		onChange?.(opt.id);
	}

	function iconName(opt: OptionItem | undefined): OptionIcon {
		return opt?.icon ?? 'globe';
	}
</script>

{#snippet Icon({ name, size = 22 }: { name: OptionIcon; size?: number })}
	{#if name === 'lock'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
			<path
				d="M17 9V7a5 5 0 0 0-10 0v2H5v12h14V9h-2Zm-8 0V7a3 3 0 1 1 6 0v2H9Zm3 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"
			/>
		</svg>
	{:else if name === 'users'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	{:else if name === 'eye'}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
			<circle cx="12" cy="12" r="3" />
		</svg>
	{:else}
		<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="10" />
			<path d="M2 12h20" />
			<path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" />
		</svg>
	{/if}
{/snippet}

<div class="op {className}" bind:this={rootEl}>
	{#if isOpen}
		<div class="op__menu" role="menu" aria-label="Visibility options">
			<div class="op__menu-inner">
				{#each data as option, index (option.id)}
					{@const isActive = selectedId === option.id}
					{@const isFirst = index === 0}
					{@const isLast = index === data.length - 1}
					<button
						type="button"
						role="menuitemradio"
						aria-checked={isActive}
						title="Set as {option.label}"
						aria-label="Select {option.label}"
						class="op__opt"
						class:op__opt--active={isActive}
						class:op__opt--first={isFirst}
						class:op__opt--last={isLast}
						class:op__opt--mid={!isFirst && !isLast}
						onclick={() => select(option)}
					>
						<span class="op__opt-ico">
							{@render Icon({ name: iconName(option), size: 22 })}
						</span>
						<span class="op__opt-label">{option.label}</span>
					</button>
				{/each}
				<div class="op__caret" aria-hidden="true"></div>
			</div>
		</div>
	{/if}

	<button
		type="button"
		class="op__trigger"
		class:op__trigger--open={isOpen}
		onclick={toggle}
		title="Change Visibility"
		aria-label="Visibility is currently {selected?.label ?? ''}. Click to change."
		aria-expanded={isOpen}
		aria-haspopup="menu"
	>
		<span class="op__trigger-ico" class:op__trigger-ico--open={isOpen}>
			{@render Icon({ name: iconName(selected), size: 24 })}
		</span>
		<span class="op__trigger-label">{selected?.label ?? ''}</span>
		<span class="op__chev" class:op__chev--open={isOpen} aria-hidden="true">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
				<path d="m6 9 6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
			</svg>
		</span>
	</button>
</div>

<style>
	.op {
		position: relative;
		display: inline-block;
		perspective: 1200px;
	}

	.op__trigger {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 1rem;
		border: 1px solid transparent;
		border-radius: 999px;
		background: #f4f4f4;
		cursor: pointer;
		user-select: none;
		transition: background 0.25s ease, border-color 0.25s ease, transform 0.12s ease;
	}

	.op__trigger:active {
		transform: scale(0.97);
	}

	.op__trigger--open {
		background: #e5e5e5;
	}

	.op__trigger-ico {
		display: flex;
		color: #afafaf;
		transition: color 0.25s ease;
	}

	.op__trigger-ico--open {
		color: #aeaeae;
	}

	.op__trigger-label {
		font-size: 1.125rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		color: #404040;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
	}

	.op__chev {
		display: flex;
		align-items: center;
		color: #afafaf;
		transition: transform 0.3s ease, color 0.25s ease;
	}

	.op__chev--open {
		transform: rotate(180deg);
		color: #aeaeae;
	}

	.op__menu {
		position: absolute;
		bottom: 100%;
		left: 50%;
		z-index: 50;
		margin-bottom: 0.5rem;
		transform: translateX(-50%);
		transform-origin: bottom center;
		animation: op-pop 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
	}

	.op__menu-inner {
		position: relative;
		display: flex;
		min-width: max-content;
		gap: 0.5rem;
		padding: 0.25rem 0.375rem;
		border-radius: 999px;
		border: 1px solid #f0f0f0;
		background: #f3f3f3;
		white-space: nowrap;
	}

	.op__caret {
		position: absolute;
		bottom: -0.375rem;
		left: 50%;
		width: 0.75rem;
		height: 0.75rem;
		translate: -50% 0;
		rotate: 45deg;
		border-right: 1px solid #f0f0f0;
		border-bottom: 1px solid #f0f0f0;
		background: #f3f3f3;
	}

	.op__opt {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border: 0;
		background: #fefefe;
		font-size: 0.9375rem;
		font-weight: 600;
		color: #6e6e6e;
		cursor: pointer;
		transition: color 0.2s ease, transform 0.12s ease;
	}

	.op__opt:hover {
		transform: translateY(-1px);
	}

	.op__opt:active {
		transform: scale(0.96);
	}

	.op__opt--first {
		border-radius: 999px 1rem 1rem 999px;
	}

	.op__opt--last {
		border-radius: 1rem 999px 999px 1rem;
	}

	.op__opt--mid {
		border-radius: 0;
	}

	.op__opt--active {
		color: #010101;
	}

	.op__opt-ico {
		display: flex;
	}

	.op__opt-label {
		position: relative;
		z-index: 1;
		font-size: 1.125rem;
		font-weight: 700;
	}

	@keyframes op-pop {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(8px) scale(1.05);
			filter: blur(3px);
		}
		to {
			opacity: 1;
			transform: translateX(-50%) translateY(-2px) scale(1);
			filter: blur(0);
		}
	}
</style>
