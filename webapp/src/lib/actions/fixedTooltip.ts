/**
 * Positions .ui-tip__bubble with position:fixed so it escapes overflow
 * stacking contexts (sidebar scroll, main content paint order).
 */
export function fixedTooltip(node: HTMLElement, opts?: { placement?: 'right' | 'top' }) {
	const placement = opts?.placement ?? 'right';
	const bubble = node.querySelector<HTMLElement>('.ui-tip__bubble');
	if (!bubble) return {};

	function place() {
		const r = node.getBoundingClientRect();
		const gap = 10;
		bubble!.style.position = 'fixed';
		bubble!.style.zIndex = '2147483000';
		bubble!.style.right = 'auto';
		bubble!.style.bottom = 'auto';

		if (placement === 'top') {
			bubble!.style.left = `${r.left + r.width / 2}px`;
			bubble!.style.top = `${r.top - gap}px`;
			bubble!.style.transform = 'translate(-50%, -100%)';
			bubble!.dataset.placed = 'top';
		} else {
			bubble!.style.left = `${r.right + gap}px`;
			bubble!.style.top = `${r.top + r.height / 2}px`;
			bubble!.style.transform = 'translateY(-50%)';
			bubble!.dataset.placed = 'right';

			// Keep on-screen vertically
			requestAnimationFrame(() => {
				const br = bubble!.getBoundingClientRect();
				if (br.bottom > window.innerHeight - 8) {
					const dy = br.bottom - (window.innerHeight - 8);
					bubble!.style.top = `${r.top + r.height / 2 - dy}px`;
				}
				if (br.top < 8) {
					bubble!.style.top = `${r.top + r.height / 2 + (8 - br.top)}px`;
				}
				// Flip to left if overflows right edge
				if (br.right > window.innerWidth - 8) {
					bubble!.style.left = `${r.left - gap}px`;
					bubble!.style.transform = 'translate(-100%, -50%)';
					bubble!.dataset.placed = 'left';
				}
			});
		}
	}

	function onEnter() {
		place();
	}

	function onMove() {
		if (node.matches(':hover') || node.contains(document.activeElement)) place();
	}

	node.addEventListener('mouseenter', onEnter);
	node.addEventListener('focusin', onEnter);
	window.addEventListener('scroll', onMove, true);
	window.addEventListener('resize', onMove);

	return {
		destroy() {
			node.removeEventListener('mouseenter', onEnter);
			node.removeEventListener('focusin', onEnter);
			window.removeEventListener('scroll', onMove, true);
			window.removeEventListener('resize', onMove);
		}
	};
}
