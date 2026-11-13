<!-- Where everything on the globe comes from: each source's own attribution. -->
<script lang="ts">
	import type { PuckState as App } from '@jonibach/geo-puck';
	import { SOURCES } from '@jonibach/geo-puck';
	import { OSM_ATTRIBUTION } from '@jonibach/geo-puck-data';
	import { SEARCH_ATTRIBUTION } from '@jonibach/geo-puck-data';
	import { WEATHER_ATTRIBUTION } from '@jonibach/geo-puck-data';

	let { app }: { app: App } = $props();

	const parts = $derived([
		'Elevation: Terrarium tiles (Mapzen, AWS Open Data)',
		...(app.surface !== 'painted' ? [SOURCES[app.surface].attribution] : []),
		`Map ${OSM_ATTRIBUTION}, via OpenFreeMap`,
		WEATHER_ATTRIBUTION,
		SEARCH_ATTRIBUTION
	]);
</script>

<p class="credits">{parts.join(' · ')}</p>

<style>
	.credits {
		position: absolute;
		z-index: 35;
		right: 0;
		bottom: 0;
		left: 0;
		margin: 0;
		padding: 4px 10px;
		font-size: 10.5px;
		line-height: 1.4;
		text-align: center;
		color: var(--muted);
		background: rgb(255 253 248 / 0.6);
	}
	@media (max-width: 700px) {
		.credits {
			font-size: 9px;
		}
	}
</style>
