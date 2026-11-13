<!--
  The 3D view: a transparent WebGL canvas (Threlte) over a CSS sky gradient that follows the time
  of day at the place, easing from one sky to the next.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Canvas } from '@threlte/core';
	import { NoToneMapping, WebGLRenderer } from 'three';
	import type { PuckState } from './puck.svelte.js';
	import type { PuckLayerContext } from './state.js';
	import { Imagery } from './imagery.js';
	import FrameGovernor from './FrameGovernor.svelte';
	import GlobeStage from './GlobeStage.svelte';

	let {
		puck,
		layers,
		lettering
	}: {
		puck: PuckState;
		/** your own things on the land (trees, routes, pins…): drawn in the land's local metres */
		layers?: Snippet<[PuckLayerContext]>;
		/** the words around the plinth, if not the place's name and where it is */
		lettering?: { title: string; date: string };
	} = $props();

	// one imagery texture for the whole visit: each place repaints it
	const imagery = new Imagery();
	$effect(() => () => imagery.dispose());

	const DAY_SKY = { top: '#bfe1f7', bottom: '#f3f8fb' };
	let top = $state(DAY_SKY.top);
	let bottom = $state(DAY_SKY.bottom);
	// sharp on high-density screens, within reason (the frame rate matters more)
	const dpr = Math.min(2, globalThis.devicePixelRatio ?? 1);
</script>

<div class="globe" style:--top={top} style:--bottom={bottom}>
	<Canvas {dpr} toneMapping={NoToneMapping} createRenderer={(canvas) => new WebGLRenderer({ canvas, alpha: true, antialias: true })}>
		<FrameGovernor playing={() => puck.playing} />
		<GlobeStage
			{puck}
			{imagery}
			{layers}
			{lettering}
			onshown={(data) => {
				// the meadow has a fair-weather daytime sky, whatever the last place's light was
				if (!data) ({ top, bottom } = DAY_SKY);
			}}
			onsky={(t, b) => ((top = t), (bottom = b))}
		/>
	</Canvas>
</div>

<style>
	/* registered so the sky gradient can ease between colours (a gradient itself can't transition) */
	@property --top {
		syntax: '<color>';
		inherits: true;
		initial-value: #bfe1f7;
	}
	@property --bottom {
		syntax: '<color>';
		inherits: true;
		initial-value: #f3f8fb;
	}
	.globe {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, var(--top), var(--bottom));
		transition:
			--top 1.2s ease,
			--bottom 1.2s ease;
	}
	/* touch drags turn the globe, never scroll the page */
	.globe :global(canvas),
	.globe :global(div:has(> canvas)) {
		touch-action: none !important;
	}
</style>
