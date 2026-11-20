<script lang="ts">
	/**
	 * Demo CutoutCard — layout completo (media + inset + pin + content + action).
	 * Contenido orientado a Smart WMS / Abellis.
	 */
	import CutoutCard, { cutoutCardSurfaceClassName } from './CutoutCard.svelte';
	import CutoutCardMedia from './CutoutCardMedia.svelte';
	import CutoutCardImage from './CutoutCardImage.svelte';
	import CutoutCardOverlay from './CutoutCardOverlay.svelte';
	import CutoutCardInsetLabel from './CutoutCardInsetLabel.svelte';
	import CutoutCardPin from './CutoutCardPin.svelte';
	import CutoutCardContent from './CutoutCardContent.svelte';
	import CutoutCardFooter from './CutoutCardFooter.svelte';
	import CutoutCardAction from './CutoutCardAction.svelte';
	import CutoutCorner from './CutoutCorner.svelte';

	interface Props {
		imageSrc?: string;
		imageAlt?: string;
		label?: string;
		pin?: string;
		title?: string;
		description?: string;
		author?: string;
		meta?: string;
		actionLabel?: string;
		actionHref?: string;
	}

	let {
		imageSrc = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=900&h=700&fit=crop',
		imageAlt = 'Nave de almacén',
		label = 'Operaciones',
		pin = 'Nuevo',
		title = 'Ola de picking · Nave 2',
		description = 'Prioriza líneas críticas, valida el batch y libera el muelle con el mismo contexto de almacén en cada paso.',
		author = 'Ana Operaciones',
		meta = '5 min',
		actionLabel = 'Abrir ola',
		actionHref = '/picking'
	}: Props = $props();
</script>

<div class="ccd">
	<div class="ccd-frame">
		<CutoutCard class={cutoutCardSurfaceClassName}>
			<CutoutCardMedia class="ccd-media">
				<CutoutCardImage src={imageSrc} alt={imageAlt} />
				<CutoutCardOverlay />

				<CutoutCardInsetLabel class="ccd-inset">
					<span class="ccd-inset__text">{label}</span>
					<span class="ccd-corner ccd-corner--inset-r">
						<CutoutCorner size={32} />
					</span>
					<span class="ccd-corner ccd-corner--inset-t">
						<CutoutCorner size={32} />
					</span>
				</CutoutCardInsetLabel>

				<CutoutCardPin class="ccd-pin">
					{pin}
					<span class="ccd-corner ccd-corner--pin-l">
						<CutoutCorner size={24} />
					</span>
					<span class="ccd-corner ccd-corner--pin-b">
						<CutoutCorner size={24} />
					</span>
				</CutoutCardPin>
			</CutoutCardMedia>

			<CutoutCardContent>
				<h2 class="ccd-title" data-cc-item>{title}</h2>
				<p class="ccd-desc" data-cc-item>{description}</p>
				<div data-cc-item>
					<CutoutCardFooter class="ccd-footer">
						<div class="ccd-author">
							<span class="ccd-avatar" aria-hidden="true"></span>
							<span class="ccd-author__name">{author}</span>
						</div>
						<span class="ccd-meta">{meta}</span>
					</CutoutCardFooter>
				</div>
			</CutoutCardContent>

			<CutoutCardAction class="ccd-action">
				<a class="ccd-btn" href={actionHref}>{actionLabel}</a>
			</CutoutCardAction>
		</CutoutCard>
	</div>
</div>

<style>
	.ccd {
		display: flex;
		width: 100%;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.ccd-frame {
		position: relative;
		width: 100%;
		max-width: 28rem;
	}
	.ccd :global(.ccd-media) {
		height: 18rem;
	}
	.ccd :global(.ccd-inset) {
		bottom: 0;
		left: 0;
		border-top-right-radius: 20px;
		padding: 0.7rem 1.15rem;
	}
	.ccd-inset__text {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--slate, #5c6b7d);
	}
	.ccd :global(.ccd-pin) {
		top: 0;
		right: 0;
		border-bottom-left-radius: 16px;
		padding: 0.5rem 1rem;
		font-size: 0.8125rem;
		background: var(--navy, #004c8b);
		color: #fff;
		box-shadow: 0 6px 16px color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
	}
	.ccd-corner {
		position: absolute;
		color: var(--card, #fff);
		line-height: 0;
	}
	.ccd-corner--inset-r {
		right: -31px;
		bottom: -1px;
		transform: rotate(90deg);
		color: var(--card, #fff);
	}
	.ccd-corner--inset-t {
		top: -31px;
		left: -1px;
		transform: rotate(90deg);
		color: var(--card, #fff);
	}
	.ccd-corner--pin-l {
		top: 0;
		left: -23px;
		transform: rotate(-90deg);
		color: var(--navy, #004c8b);
	}
	.ccd-corner--pin-b {
		right: 0;
		bottom: -23px;
		transform: rotate(-90deg);
		color: var(--navy, #004c8b);
	}
	.ccd-title {
		margin: 0 0 0.45rem;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 1.2rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		line-height: 1.3;
		color: var(--head-ink, #012a50);
		padding-right: 5.5rem;
	}
	.ccd-desc {
		margin: 0 0 1rem;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--slate, #5c6b7d);
		padding-right: 5.5rem;
	}
	.ccd :global(.ccd-footer) {
		border-top: 1px solid color-mix(in srgb, var(--line, #d9e2ec) 85%, transparent);
		padding-top: 0.9rem;
	}
	.ccd-author {
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}
	.ccd-avatar {
		width: 2rem;
		height: 2rem;
		border-radius: 999px;
		background: linear-gradient(145deg, var(--gold, #c9a227), var(--navy, #004c8b));
		box-shadow: 0 0 0 2px var(--card, #fff);
		flex-shrink: 0;
	}
	.ccd-author__name {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--head-ink, #012a50);
	}
	.ccd-meta {
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
		color: var(--slate, #5c6b7d);
	}
	.ccd :global(.ccd-action) {
		right: 1.15rem;
		bottom: 1.15rem;
	}
	.ccd-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 1rem;
		border-radius: 999px;
		background: var(--navy, #004c8b);
		color: #fff;
		font-family: var(--disp, 'Space Grotesk', system-ui, sans-serif);
		font-size: 0.8125rem;
		font-weight: 650;
		text-decoration: none;
		box-shadow: 0 8px 18px color-mix(in srgb, var(--navy, #004c8b) 28%, transparent);
		transition: transform 0.18s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.2s ease;
	}
	.ccd-btn:hover {
		transform: translateY(-1px);
		box-shadow: 0 12px 24px color-mix(in srgb, var(--navy, #004c8b) 32%, transparent);
	}
	.ccd-btn:active {
		transform: scale(0.97);
	}
</style>
