<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		/** Show the gradient media band at the top */
		media?: boolean;
		/** Lift slightly on hover */
		interactive?: boolean;
		title?: string;
		meta?: string;
		badge?: string;
		class?: string;
		children?: Snippet;
		mediaAction?: Snippet;
		footer?: Snippet;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		media = false,
		interactive = false,
		title,
		meta,
		badge,
		class: className = '',
		children,
		mediaAction,
		footer,
		onclick
	}: Props = $props();
</script>

{#if interactive || onclick}
	<article
		class="ui-card {className}"
		class:ui-card--interactive={interactive || !!onclick}
		role={onclick ? 'button' : undefined}
		tabindex={onclick ? 0 : undefined}
		onclick={onclick}
		onkeydown={(e) => {
			if (!onclick) return;
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onclick(e as unknown as MouseEvent);
			}
		}}
	>
		{#if media}
			<div class="ui-card__media">
				{#if mediaAction}
					{@render mediaAction()}
				{/if}
			</div>
		{/if}
		<div class="ui-card__body">
			{#if title}
				<p class="ui-card__title">{title}</p>
			{/if}
			{#if meta}
				<p class="ui-card__meta">{meta}</p>
			{/if}
			{#if children}
				{@render children()}
			{/if}
			{#if badge}
				<div class="ui-card__badge"><span>{badge}</span></div>
			{/if}
			{#if footer}
				{@render footer()}
			{/if}
		</div>
	</article>
{:else}
	<article class="ui-card {className}">
		{#if media}
			<div class="ui-card__media">
				{#if mediaAction}
					{@render mediaAction()}
				{/if}
			</div>
		{/if}
		<div class="ui-card__body">
			{#if title}
				<p class="ui-card__title">{title}</p>
			{/if}
			{#if meta}
				<p class="ui-card__meta">{meta}</p>
			{/if}
			{#if children}
				{@render children()}
			{/if}
			{#if badge}
				<div class="ui-card__badge"><span>{badge}</span></div>
			{/if}
			{#if footer}
				{@render footer()}
			{/if}
		</div>
	</article>
{/if}
