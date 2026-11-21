/**
 * SVG path for a continuous corner (approx. Figma squircle / iOS smooth radius).
 * cornerSmoothing ≈ 1 → superellipse-like corners without the figma-squircle package.
 */
export function squirclePath(
	width: number,
	height: number,
	radius: number,
	smoothing = 1
): string {
	const r = Math.min(radius, width / 2, height / 2);
	if (r <= 0) {
		return `M0 0H${width}V${height}H0Z`;
	}

	const s = Math.min(Math.max(smoothing, 0), 1);
	const c = r * (1 - s * 0.45);
	const p = r * (1 + s * 0.25);

	const w = width;
	const h = height;

	return [
		`M${p} 0`,
		`H${w - p}`,
		`C${w - c} 0 ${w} ${c} ${w} ${p}`,
		`V${h - p}`,
		`C${w} ${h - c} ${w - c} ${h} ${w - p} ${h}`,
		`H${p}`,
		`C${c} ${h} 0 ${h - c} 0 ${h - p}`,
		`V${p}`,
		`C0 ${c} ${c} 0 ${p} 0`,
		`Z`
	].join(' ');
}

export function squircleClip(width: number, height: number, radius: number): string {
	return `path('${squirclePath(width, height, radius)}')`;
}
