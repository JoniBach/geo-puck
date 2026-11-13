<!--
  The whole app: the puck filling the window, the card with search and settings, the time of day
  along the bottom, and the credits. A place in the address (?lat=…&lon=…&name=…) opens there.
  Add &forest to plant the generative forest: a tree for each named place on the land.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { Forest, GeoPuck, PuckState, seedOf, type Loaded, type TreeSpec } from '@jonibach/geo-puck';
	import Credits from '$lib/ui/Credits.svelte';
	import Panel from '$lib/ui/Panel.svelte';
	import TimeDock from '$lib/ui/TimeDock.svelte';

	const app = new PuckState();
	let forest = $state(false);
	let growth = $state(1);
	let over = $state<string | null>(null);

	onMount(() => {
		const q = new URLSearchParams(location.search);
		forest = q.has('forest');
		const size = parseFloat(q.get('radius') ?? '');
		if (size >= 800 && size <= 80000) {
			app.radius = size;
			// a wide puck is nearly flat at true scale: stand its hills up
			if (size > 12000) app.exaggeration = Math.min(14, 2 * Math.sqrt(size / 4000));
		}
		// the place stays in the address bar, so a refresh or a shared link comes back to it
		app.onplace = (spot) => {
			const next = new URLSearchParams(PuckState.toQuery(spot));
			if (forest) next.set('forest', '');
			if (app.radius !== 4000) next.set('radius', `${app.radius}`);
			replaceState(`?${next}`, {});
		};
		const spot = PuckState.fromUrl();
		// &hour=14.5 opens at that time of day there (otherwise: now)
		const hour = parseFloat(q.get('hour') ?? '');
		if (spot)
			app.go(spot).then(() => {
				if (hour >= 0 && hour < 24) app.time = app.day[0] + hour * 3600;
			});
	});

	// the demo forest: a tree for each named place, bigger and leafier for bigger places
	const KIND = { town: [1, 60], village: [0.8, 34], water: [0.7, 26], peak: [0.6, 18], hamlet: [0.55, 14], locality: [0.4, 8] } as const;
	const GREENS: [number, number, number][] = [
		[0.36, 0.6, 0.33],
		[0.47, 0.66, 0.3],
		[0.25, 0.5, 0.36],
		[0.78, 0.62, 0.22],
		[0.74, 0.4, 0.2]
	];
	function plant(data: Loaded, grown: number): TreeSpec[] {
		return data.map.places.map((p) => {
			const seed = seedOf(p.kind + p.name);
			const [age, leaves] = KIND[p.kind];
			return { id: p.name, x: p.x, n: p.n, seed, age: age * grown, leaves: leaves * Math.min(1, grown * 1.4), colour: GREENS[seed % GREENS.length] };
		});
	}
	const trees = $derived(forest && app.loaded ? plant(app.loaded, growth) : []);
</script>

<svelte:head>
	<title>{app.loaded ? `${app.loaded.spot.name} · Geo Puck` : 'Geo Puck'}</title>
</svelte:head>

<main>
	<GeoPuck puck={app}>
		{#snippet layers(ctx)}
			{#if forest}<Forest {ctx} {trees} selected={over} onhover={(tree) => (over = tree?.id ?? null)} />{/if}
		{/snippet}
	</GeoPuck>
	<Panel {app} />
	{#if app.loaded}<TimeDock {app} />{/if}
	{#if forest && app.loaded}
		<label class="grow">
			<span>Forest {over ? `· ${over}` : ''}</span>
			<input type="range" min="0" max="1" step="0.005" bind:value={growth} aria-label="How grown the forest is" />
		</label>
	{/if}
	<Credits {app} />
</main>

<style>
	main {
		position: fixed;
		inset: 0;
		overflow: hidden;
	}
	.grow {
		position: absolute;
		right: 16px;
		top: 16px;
		display: grid;
		gap: 6px;
		padding: 10px 14px;
		border-radius: var(--radius-sm);
		background: var(--glass);
		box-shadow: var(--shadow);
		font: 600 13px var(--font-ui);
		color: var(--ink);
	}
	.grow input {
		width: 180px;
		accent-color: var(--accent);
	}
</style>
