<script lang="ts">
	const components = [
		{ id: 'task-widget', name: 'TaskWidget', status: 'ready', href: '/lab/task-widget', description: 'Tarjeta expandible de tarea con progreso, subtasks, priority/status y assignees.' },
		{ id: 'hover-expand', name: 'HoverExpand', status: 'ready', href: '/lab/hover-expand', description: 'Lista de avatares que se expanden al hover con labels.' },
		{ id: 'line-chart', name: 'LineChart', status: 'ready', href: '/lab/line-chart', description: 'Multi-serie line/area SVG: crosshair, tooltip, leyenda toggle, loading (throughput WMS).' },
		{ id: 'donut-chart', name: 'DonutChart', status: 'ready', href: '/lab/donut-chart', description: 'Anillo de segmentos redondeados, centro vinculado y leyenda con teclado (mix WMS).' }
	] as const;
</script>
