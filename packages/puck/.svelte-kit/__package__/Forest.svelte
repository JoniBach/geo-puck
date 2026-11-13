<!--
  A generative forest on the land: one tree for each point, each grown from its own seed, with its
  age, its number of leaf clusters and its leaf colour driven by your data (see forest.ts).

  A layer for <GeoPuck>: give it the layer context and the trees.

    <GeoPuck {puck}>
      {#snippet layers(ctx)}
        <Forest {ctx} {trees} onpick={(tree) => …} />
      {/snippet}
    </GeoPuck>

  All the trees are one mesh, lit by the puck's own sun and moon. The trees' shapes are rebuilt
  when `trees` changes (a few milliseconds for a few hundred); standing them on the ground, the
  land's rise out of the plinth and the sway in the wind are done in the vertex shader.
-->
<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Mesh, MeshStandardMaterial, Vector3 } from 'three';
	import { busy } from './FrameGovernor.svelte';
	import { ForestBuffers, type TreeSpec } from './forest.js';
	import type { PuckLayerContext } from './state.js';

	let {
		ctx,
		trees,
		height = 0.15,
		selected = null,
		onhover,
		onpick
	}: {
		ctx: PuckLayerContext;
		trees: TreeSpec[];
		/** a full-grown tree's height, as a share of the puck's radius (trees are symbols, not to scale) */
		height?: number;
		/** the id of a tree to ring on the ground */
		selected?: string | null;
		/** the pointer is over a tree (or, with null, has left it) */
		onhover?: (tree: TreeSpec | null) => void;
		/** a tree was clicked or tapped */
		onpick?: (tree: TreeSpec) => void;
	} = $props();

	const { camera, dom, invalidate } = useThrelte();
	const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

	const buffers = new ForestBuffers();
	const geometry = new BufferGeometry();
	const uniforms = { uExag: { value: 1 }, uRise: { value: 1 }, uTime: { value: 0 }, uSway: { value: 0 } };
	const material = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 });
	material.onBeforeCompile = (shader) => {
		Object.assign(shader.uniforms, uniforms);
		shader.vertexShader = shader.vertexShader
			.replace(
				'#include <common>',
				/* glsl */ `#include <common>
				attribute vec3 aBase;
				uniform float uExag;
				uniform float uRise;
				uniform float uTime;
				uniform float uSway;`
			)
			.replace(
				'#include <begin_vertex>',
				/* glsl */ `
				// the tree, grown out of the ground as the land rises, swaying more the higher up
				// (uSway: a full-grown tree's height, so any size of puck sways alike; 0 for no sway)
				vec3 transformed = position * uRise;
				float bend = uSway > 0.0 ? transformed.y * transformed.y / uSway : 0.0;
				float phase = aBase.x * 0.0021 + aBase.z * 0.0017;
				transformed.x += sin(uTime * 0.9 + phase) * bend * 0.012;
				transformed.z += cos(uTime * 0.7 + phase * 1.3) * bend * 0.008;
				// …standing on the land, at its exaggerated height
				transformed += vec3(aBase.x, aBase.y * uExag, aBase.z);`
			);
	};
	const mesh = new Mesh(geometry, material);
	mesh.frustumCulled = false; // its vertices are placed in the shader

	let builtFor: TreeSpec[] | null = null;
	let builtVersion = -1;
	let capacity = { v: 0, i: 0 };

	function build() {
		const R = ctx.radius;
		const H = height * R;
		buffers.reset();
		for (const tree of trees) {
			if (Math.hypot(tree.x, tree.n) > R * 0.985) continue; // off the edge of the land
			const g = ctx.globe.ground(tree.x, tree.n);
			buffers.add(tree, H, Number.isFinite(g) ? g : 0);
		}
		uniforms.uSway.value = still ? 0 : H;
		const fits = buffers.position.length === capacity.v && buffers.index.length === capacity.i;
		if (!fits) {
			// the buffers grew: new attributes (the GPU keeps the size it was first given)
			for (const [name, array] of [['position', buffers.position], ['color', buffers.color], ['aBase', buffers.base]] as const) {
				const attribute = new BufferAttribute(array, 3);
				attribute.setUsage(DynamicDrawUsage);
				geometry.setAttribute(name, attribute);
			}
			geometry.setIndex(new BufferAttribute(buffers.index, 1));
			capacity = { v: buffers.position.length, i: buffers.index.length };
		} else {
			for (const name of ['position', 'color', 'aBase']) geometry.getAttribute(name).needsUpdate = true;
			geometry.index!.needsUpdate = true;
		}
		geometry.setDrawRange(0, buffers.indices);
		builtFor = trees;
		builtVersion = ctx.globe.version;
	}

	useTask((dt) => {
		// (re)grow when the trees change, or the land under them does
		if (trees !== builtFor || ctx.globe.version !== builtVersion) build();
		uniforms.uExag.value = ctx.exaggeration;
		const r = ctx.rise();
		// the trees come up a little after the land, so they seem to grow out of it
		const u = Math.min(1, Math.max(0, (r - 0.35) / 0.65));
		uniforms.uRise.value = u * u * (3 - 2 * u);
		uniforms.uTime.value += dt;
	});

	// while the trees are changing (a slider being dragged, a year playing), keep to full speed
	$effect(() => {
		void trees;
		busy(400);
		invalidate();
	});

	// ---- pointing at a tree: the nearest crown to the pointer, on screen --------------------------
	const p = new Vector3();
	function treeAt(event: PointerEvent): TreeSpec | null {
		const cam = camera.current;
		const box = dom.getBoundingClientRect();
		const mx = event.clientX - box.left;
		const my = event.clientY - box.top;
		mesh.updateWorldMatrix(true, false);
		let best: TreeSpec | null = null;
		let bestD = 34; // px
		for (const { spec, height: h } of buffers.trees) {
			const g = ctx.globe.ground(spec.x, spec.n);
			// its crown: two thirds of the way up
			p.set(spec.x, (Number.isFinite(g) ? g : 0) * ctx.exaggeration + h * 0.66, -spec.n)
				.applyMatrix4(mesh.matrixWorld)
				.project(cam);
			if (p.z > 1) continue;
			const d = Math.hypot((p.x * 0.5 + 0.5) * box.width - mx, (-p.y * 0.5 + 0.5) * box.height - my);
			if (d < bestD) {
				bestD = d;
				best = spec;
			}
		}
		return best;
	}

	let over: TreeSpec | null = null;
	let down: { x: number; y: number } | null = null;
	$effect(() => {
		if (!onhover && !onpick) return;
		const move = (e: PointerEvent) => {
			if (e.pointerType === 'touch') return;
			const tree = treeAt(e);
			if (tree?.id !== over?.id || (tree === null) !== (over === null)) {
				over = tree;
				dom.style.cursor = tree && onpick ? 'pointer' : '';
				onhover?.(tree);
			}
		};
		const press = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
		const release = (e: PointerEvent) => {
			// a click, not the end of a drag that turned the puck
			if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6) {
				const tree = treeAt(e);
				if (tree) onpick?.(tree);
			}
			down = null;
		};
		const leave = () => {
			if (over) {
				over = null;
				dom.style.cursor = '';
				onhover?.(null);
			}
		};
		dom.addEventListener('pointermove', move);
		dom.addEventListener('pointerdown', press);
		dom.addEventListener('pointerup', release);
		dom.addEventListener('pointerleave', leave);
		return () => {
			dom.removeEventListener('pointermove', move);
			dom.removeEventListener('pointerdown', press);
			dom.removeEventListener('pointerup', release);
			dom.removeEventListener('pointerleave', leave);
			dom.style.cursor = '';
		};
	});

	// the ring under the selected tree
	const ring = $derived.by(() => {
		if (!selected) return null;
		const tree = trees.find((t) => t.id === selected);
		if (!tree || Math.hypot(tree.x, tree.n) > ctx.radius * 0.985) return null;
		const g = ctx.globe.ground(tree.x, tree.n);
		return { x: tree.x, n: tree.n, g: Number.isFinite(g) ? g : 0 };
	});
	const s = $derived(ctx.radius / 1800);

	$effect(() => () => {
		geometry.dispose();
		material.dispose();
	});
</script>

<T is={mesh} />

{#if ring}
	<T.Mesh position={[ring.x, ring.g * ctx.exaggeration + 4 * s, -ring.n]} rotation.x={-Math.PI / 2} scale={[s, s, s]}>
		<T.RingGeometry args={[30, 40, 40]} />
		<T.MeshBasicMaterial color="#c2562d" transparent opacity={0.85} depthWrite={false} />
	</T.Mesh>
{/if}
