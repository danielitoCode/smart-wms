<script lang="ts">
	/**
	 * Iphone — marco SVG de teléfono con pantalla (img o video).
	 * Port Svelte 5 del componente Magic UI / React.
	 */
	interface Props {
		src?: string;
		videoSrc?: string;
		class?: string;
		style?: string;
	}

	let { src, videoSrc, class: className = '', style = '' }: Props = $props();

	const PHONE_WIDTH = 433;
	const PHONE_HEIGHT = 882;
	const SCREEN_X = 21.25;
	const SCREEN_Y = 19.25;
	const SCREEN_WIDTH = 389.5;
	const SCREEN_HEIGHT = 843.5;
	const SCREEN_RADIUS = 55.75;

	const LEFT_PCT = (SCREEN_X / PHONE_WIDTH) * 100;
	const TOP_PCT = (SCREEN_Y / PHONE_HEIGHT) * 100;
	const WIDTH_PCT = (SCREEN_WIDTH / PHONE_WIDTH) * 100;
	const HEIGHT_PCT = (SCREEN_HEIGHT / PHONE_HEIGHT) * 100;
	const RADIUS_H = (SCREEN_RADIUS / SCREEN_WIDTH) * 100;
	const RADIUS_V = (SCREEN_RADIUS / SCREEN_HEIGHT) * 100;

	const hasVideo = $derived(!!videoSrc);
	const hasMedia = $derived(hasVideo || !!src);

	const uid = `ip-${Math.random().toString(36).slice(2, 9)}`;
	const maskId = `screenPunch-${uid}`;
</script>

<div
	class="iphone {className}"
	style="aspect-ratio: {PHONE_WIDTH} / {PHONE_HEIGHT}; {style}"
>
	{#if hasVideo}
		<div
			class="iphone-screen"
			style="left: {LEFT_PCT}%; top: {TOP_PCT}%; width: {WIDTH_PCT}%; height: {HEIGHT_PCT}%; border-radius: {RADIUS_H}% / {RADIUS_V}%;"
		>
			<video
				class="iphone-media"
				src={videoSrc}
				autoplay
				loop
				muted
				playsinline
				preload="metadata"
			></video>
		</div>
	{:else if src}
		<div
			class="iphone-screen"
			style="left: {LEFT_PCT}%; top: {TOP_PCT}%; width: {WIDTH_PCT}%; height: {HEIGHT_PCT}%; border-radius: {RADIUS_H}% / {RADIUS_V}%;"
		>
			<img class="iphone-media iphone-media--img" {src} alt="" />
		</div>
	{/if}

	<svg
		viewBox="0 0 {PHONE_WIDTH} {PHONE_HEIGHT}"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		class="iphone-frame"
		aria-hidden="true"
	>
		<g mask={hasMedia ? `url(#${maskId})` : undefined}>
			<path
				d="M2 73C2 32.6832 34.6832 0 75 0H357C397.317 0 430 32.6832 430 73V809C430 849.317 397.317 882 357 882H75C34.6832 882 2 849.317 2 809V73Z"
				class="iphone-fill-chrome"
			/>
			<path
				d="M0 171C0 170.448 0.447715 170 1 170H3V204H1C0.447715 204 0 203.552 0 203V171Z"
				class="iphone-fill-chrome"
			/>
			<path
				d="M1 234C1 233.448 1.44772 233 2 233H3.5V300H2C1.44772 300 1 299.552 1 299V234Z"
				class="iphone-fill-chrome"
			/>
			<path
				d="M1 319C1 318.448 1.44772 318 2 318H3.5V385H2C1.44772 385 1 384.552 1 384V319Z"
				class="iphone-fill-chrome"
			/>
			<path
				d="M430 279H432C432.552 279 433 279.448 433 280V384C433 384.552 432.552 385 432 385H430V279Z"
				class="iphone-fill-chrome"
			/>
			<path
				d="M6 74C6 35.3401 37.3401 4 76 4H356C394.66 4 426 35.3401 426 74V808C426 846.66 394.66 878 356 878H76C37.3401 878 6 846.66 6 808V74Z"
				class="iphone-fill-body"
			/>
		</g>

		<path
			opacity="0.5"
			d="M174 5H258V5.5C258 6.60457 257.105 7.5 256 7.5H176C174.895 7.5 174 6.60457 174 5.5V5Z"
			class="iphone-fill-chrome"
		/>

		<path
			d="M{SCREEN_X} 75C{SCREEN_X} 44.2101 46.2101 {SCREEN_Y} 77 {SCREEN_Y}H355C385.79 {SCREEN_Y} 410.75 44.2101 410.75 75V807C410.75 837.79 385.79 862.75 355 862.75H77C46.2101 862.75 {SCREEN_X} 837.79 {SCREEN_X} 807V75Z"
			class="iphone-fill-chrome iphone-stroke-chrome"
			mask={hasMedia ? `url(#${maskId})` : undefined}
		/>

		<path
			d="M154 48.5C154 38.2827 162.283 30 172.5 30H259.5C269.717 30 278 38.2827 278 48.5C278 58.7173 269.717 67 259.5 67H172.5C162.283 67 154 58.7173 154 48.5Z"
			class="iphone-fill-island"
		/>
		<path
			d="M249 48.5C249 42.701 253.701 38 259.5 38C265.299 38 270 42.701 270 48.5C270 54.299 265.299 59 259.5 59C253.701 59 249 54.299 249 48.5Z"
			class="iphone-fill-island"
		/>
		<path
			d="M254 48.5C254 45.4624 256.462 43 259.5 43C262.538 43 265 45.4624 265 48.5C265 51.5376 262.538 54 259.5 54C256.462 54 254 51.5376 254 48.5Z"
			class="iphone-fill-chrome"
		/>

		<defs>
			<mask id={maskId} maskUnits="userSpaceOnUse">
				<rect x="0" y="0" width={PHONE_WIDTH} height={PHONE_HEIGHT} fill="white" />
				<rect
					x={SCREEN_X}
					y={SCREEN_Y}
					width={SCREEN_WIDTH}
					height={SCREEN_HEIGHT}
					rx={SCREEN_RADIUS}
					ry={SCREEN_RADIUS}
					fill="black"
				/>
			</mask>
		</defs>
	</svg>
</div>

<style>
	.iphone {
		position: relative;
		display: inline-block;
		width: 100%;
		vertical-align: middle;
		line-height: 0;
	}

	.iphone-screen {
		pointer-events: none;
		position: absolute;
		z-index: 0;
		overflow: hidden;
	}

	.iphone-media {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.iphone-media--img {
		object-position: top;
	}

	.iphone-frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		transform: translateZ(0);
	}

	.iphone-fill-chrome {
		fill: #e5e5e5;
	}
	.iphone-stroke-chrome {
		stroke: #e5e5e5;
		stroke-width: 0.5;
	}
	.iphone-fill-body {
		fill: #fff;
	}
	.iphone-fill-island {
		fill: #f5f5f5;
	}

	:global(.dark) .iphone-fill-chrome,
	:global(html.dark) .iphone-fill-chrome {
		fill: #404040;
	}
	:global(.dark) .iphone-stroke-chrome,
	:global(html.dark) .iphone-stroke-chrome {
		stroke: #404040;
	}
	:global(.dark) .iphone-fill-body,
	:global(html.dark) .iphone-fill-body {
		fill: #262626;
	}
	:global(.dark) .iphone-fill-island,
	:global(html.dark) .iphone-fill-island {
		fill: #262626;
	}
</style>
