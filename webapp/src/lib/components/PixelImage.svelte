<script lang="ts">
	/**
	 * PixelImage — imagen que aparece en “pixels” con clip-path y reveal de color.
	 * Port Svelte 5 del componente Magic UI / React.
	 */
	type Grid = { rows: number; cols: number };

	const DEFAULT_GRIDS: Record<string, Grid> = {
		'6x4': { rows: 4, cols: 6 },
		'8x8': { rows: 8, cols: 8 },
		'8x3': { rows: 3, cols: 8 },
		'4x6': { rows: 6, cols: 4 },
		'3x8': { rows: 8, cols: 3 }
	};

	type PredefinedGridKey = keyof typeof DEFAULT_GRIDS;

	interface Props {
		src: string;
		grid?: PredefinedGridKey;
		customGrid?: Grid;
		grayscaleAnimation?: boolean;
		pixelFadeInDuration?: number;
		maxAnimationDelay?: number;
		colorRevealDelay?: number;
		class?: string;
	}

	let {
		src,
		grid = '6x4',
		customGrid,
		grayscaleAnimation = true,
		pixelFadeInDuration = 1000,
		maxAnimationDelay = 1200,
		colorRevealDelay = 1300,
		class: className = ''
	}: Props = $props();

	const MIN_GRID = 1;
	const MAX_GRID = 16;

	const delaySeeds = Array.from({ length: MAX_GRID * MAX_GRID }, () => Math.random());

	const { rows, cols } = $derived.by(() => {
		const isValid = (g?: Grid) => {
			if (!g) return false;
			return (
				Number.isInteger(g.rows) &&
				Number.isInteger(g.cols) &&
				g.rows >= MIN_GRID &&
				g.cols >= MIN_GRID &&
				g.rows <= MAX_GRID &&
				g.cols <= MAX_GRID
			);
		};
		return isValid(customGrid) ? customGrid! : DEFAULT_GRIDS[grid];
	});

	const pieces = $derived.by(() => {
		const total = rows * cols;
		return Array.from({ length: total }, (_, index) => {
			const row = Math.floor(index / cols);
			const col = index % cols;
			const clipPath = `polygon(
				${col * (100 / cols)}% ${row * (100 / rows)}%,
				${(col + 1) * (100 / cols)}% ${row * (100 / rows)}%,
				${(col + 1) * (100 / cols)}% ${(row + 1) * (100 / rows)}%,
				${col * (100 / cols)}% ${(row + 1) * (100 / rows)}%
			)`;
			const delay = delaySeeds[index] * maxAnimationDelay;
			return { clipPath, delay };
		});
	});

	let isVisible = $state(false);
	let showColor = $state(false);

	$effect(() => {
		isVisible = true;
		const t = setTimeout(() => {
			showColor = true;
		}, colorRevealDelay);
		return () => clearTimeout(t);
	});
</script>

<div class="pixel-image {className}">
	{#each pieces as piece, index (index)}
		<div
			class="pixel-image__piece"
			class:pixel-image__piece--visible={isVisible}
			style="clip-path: {piece.clipPath}; transition-delay: {piece.delay}ms; transition-duration: {pixelFadeInDuration}ms;"
		>
			<img
				{src}
				alt=""
				class="pixel-image__img"
				class:pixel-image__img--gray={grayscaleAnimation && !showColor}
				style={grayscaleAnimation
					? `transition: filter ${pixelFadeInDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
					: 'transition: none'}
				draggable="false"
			/>
		</div>
	{/each}
</div>

<style>
	.pixel-image {
		position: relative;
		width: 18rem;
		height: 18rem;
		user-select: none;
	}

	@media (min-width: 768px) {
		.pixel-image {
			width: 24rem;
			height: 24rem;
		}
	}

	.pixel-image__piece {
		position: absolute;
		inset: 0;
		opacity: 0;
		transition-property: opacity;
		transition-timing-function: ease-out;
	}

	.pixel-image__piece--visible {
		opacity: 1;
	}

	.pixel-image__img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 2.5rem;
		filter: grayscale(0);
	}

	.pixel-image__img--gray {
		filter: grayscale(1);
	}
</style>
