// Run after a build (npm run build): these test the packaged files, as an app would import them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grow, seedOf } from '../dist/index.js';

const input = (seed, counts = [5, 3, 8, 2]) => ({
	seed: seedOf(seed),
	branches: counts.map((_, b) => `b${b}`),
	items: counts.flatMap((n, b) => Array.from({ length: n }, (_, i) => ({ id: `b${b}i${i}`, branch: b })))
});

test('the same seed and data grow the same tree; another seed grows another', () => {
	const a = grow(input('TL8782'));
	const b = grow(input('TL8782'));
	assert.deepEqual(a.nodes.map((n) => n.p), b.nodes.map((n) => n.p));
	const c = grow(input('NH9010'));
	assert.notDeepEqual(a.nodes.slice(-20).map((n) => n.p), c.nodes.slice(-20).map((n) => n.p));
});

test('the wood reaches every item', () => {
	for (const seed of ['TL8782', 'SU1234', 'IH2649']) {
		const sk = grow(input(seed, [9, 1, 4, 6, 2, 5, 3, 7, 1, 2, 4, 6]));
		sk.items.forEach((place, i) => {
			const nearest = Math.min(...place.nodes.map((ni) => Math.hypot(...sk.nodes[ni].p.map((v, k) => v - place.site[k]))));
			assert.ok(nearest < 1.4, `${seed}: item ${i} is ${nearest.toFixed(2)} from the wood`);
		});
	}
});

test('a tree is a tree: one root, every other node has a parent before it, thicker towards the root', () => {
	const sk = grow(input('SP5050'));
	assert.equal(sk.nodes.filter((n) => n.parent < 0).length, 1);
	sk.nodes.forEach((n, i) => {
		if (n.parent >= 0) {
			assert.ok(n.parent < i);
			assert.ok(sk.nodes[n.parent].radius >= n.radius - 1e-9, 'a parent is at least as thick as its child');
		}
	});
	const top = Math.max(...sk.nodes.map((n) => n.p[1]));
	assert.ok(top > 6 && top < 12.5, `about as tall as asked (10): ${top.toFixed(1)}`);
});

test("each branch's wood is its own beyond where it leaves the shared limbs", () => {
	const sk = grow(input('TQ3080'));
	const own = new Set(sk.nodes.filter((n) => n.branch >= 0).map((n) => n.branch));
	assert.equal(own.size, 4, 'every branch has wood of its own');
});
