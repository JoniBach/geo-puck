// Wood as continuous tubes: the skeleton is split into limbs (each follows its thickest child on
// from a fork, and every other child starts a limb of its own from the fork), and each limb is one
// smooth tube with a ring of vertices at every node, its radius tapering with the wood's thickness.
// Rings are kept square to the limb by parallel transport, so tubes don't twist as they bend.
import type { Skeleton, Vec } from './grow.js';

export interface WoodGeometry {
	position: Float32Array;
	normal: Float32Array;
	index: Uint32Array;
	/** for each vertex, the skeleton node it was made for */
	node: Uint32Array;
}

/** split the skeleton into limbs: lists of node indices from where they leave the parent to their tip */
export function limbs(sk: Skeleton): number[][] {
	const out: number[][] = [];
	const walk = (from: number, first: number) => {
		const limb = [from, first];
		let at = first;
		for (;;) {
			const kids = sk.nodes[at].children;
			if (!kids.length) break;
			let main = kids[0];
			for (const c of kids) if (sk.nodes[c].radius > sk.nodes[main].radius) main = c;
			for (const c of kids) if (c !== main) walk(at, c);
			limb.push(main);
			at = main;
		}
		out.push(limb);
	};
	const root = sk.nodes.findIndex((n) => n.parent < 0);
	const kids = sk.nodes[root].children;
	if (!kids.length) return out;
	// the trunk: the root's thickest child onwards
	walk(root, kids[0]);
	return out;
}

export function woodGeometry(sk: Skeleton, sides = 7): WoodGeometry {
	const position: number[] = [];
	const normal: number[] = [];
	const index: number[] = [];
	const node: number[] = [];
	const ring = sides + 1;
	for (const limb of limbs(sk)) {
		const v0 = position.length / 3;
		let carried: Vec | null = null;
		limb.forEach((ni, k) => {
			const p = sk.nodes[ni].p;
			const prev = sk.nodes[limb[Math.max(0, k - 1)]].p;
			const next = sk.nodes[limb[Math.min(limb.length - 1, k + 1)]].p;
			let t: Vec = [next[0] - prev[0], next[1] - prev[1], next[2] - prev[2]];
			const tl = Math.hypot(...t) || 1;
			t = [t[0] / tl, t[1] / tl, t[2] / tl];
			// carry the ring's orientation along the limb (parallel transport)
			if (!carried) carried = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
			const dot = carried[0] * t[0] + carried[1] * t[1] + carried[2] * t[2];
			let n: Vec = [carried[0] - t[0] * dot, carried[1] - t[1] * dot, carried[2] - t[2] * dot];
			const nl = Math.hypot(...n) || 1;
			n = [n[0] / nl, n[1] / nl, n[2] / nl];
			carried = n;
			const b: Vec = [t[1] * n[2] - t[2] * n[1], t[2] * n[0] - t[0] * n[2], t[0] * n[1] - t[1] * n[0]];
			// the first ring of a side limb sits inside its parent, as thin as the limb itself,
			// and belongs to the limb (so pointing at its base points at the limb)
			const own = k === 0 && limb.length > 1 ? limb[1] : ni;
			const radius = sk.nodes[own].radius;
			for (let s = 0; s < ring; s++) {
				const a = (s / sides) * Math.PI * 2;
				const c = Math.cos(a);
				const si = Math.sin(a);
				const dx = n[0] * c + b[0] * si;
				const dy = n[1] * c + b[1] * si;
				const dz = n[2] * c + b[2] * si;
				position.push(p[0] + dx * radius, p[1] + dy * radius, p[2] + dz * radius);
				normal.push(dx, dy, dz);
				node.push(own);
			}
		});
		for (let k = 0; k < limb.length - 1; k++)
			for (let s = 0; s < sides; s++) {
				const a = v0 + k * ring + s;
				const b = a + ring;
				index.push(a, b, a + 1, a + 1, b, b + 1);
			}
	}
	return { position: Float32Array.from(position), normal: Float32Array.from(normal), index: Uint32Array.from(index), node: Uint32Array.from(node) };
}

/**
 * One leaf: a pointed blade folded a little along its midrib, from its stalk at the origin out
 * along +z, its face to +y. About 1 long.
 */
export function leafShape() {
	// stalk, two edges, the midrib at its widest, the tip
	// prettier-ignore
	const position = new Float32Array([
		0, 0, 0,
		-0.3, 0.06, 0.42,
		0, 0.1, 0.45,
		0.3, 0.06, 0.42,
		-0.16, 0.05, 0.78,
		0.16, 0.05, 0.78,
		0, 0.02, 1
	]);
	// prettier-ignore
	const index = new Uint32Array([
		0, 2, 1,  0, 3, 2,
		1, 2, 4,  2, 5, 4,  2, 3, 5,
		4, 5, 6
	]);
	return { position, index };
}
