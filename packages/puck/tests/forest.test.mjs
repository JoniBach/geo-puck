// Run after a build (npm run build): these test the packaged files, as an app would import them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ForestBuffers, MAX_LEAVES, seedOf } from '../dist/forest.js';

const tree = (over = {}) => ({ x: 0, n: 0, seed: seedOf('TL8782'), age: 1, leaves: 30, colour: [0.3, 0.6, 0.3], ...over });
const grow = (spec) => {
	const b = new ForestBuffers();
	b.add(spec, 100, 0);
	return b;
};
const LEAF = 12; // vertices in a leaf cluster
const BOUGH = 8;

test('the same seed grows the same tree', () => {
	const a = grow(tree());
	const b = grow(tree());
	assert.equal(a.vertices, b.vertices);
	assert.deepEqual(a.position.slice(0, a.vertices * 3), b.position.slice(0, b.vertices * 3));
	const other = grow(tree({ seed: seedOf('NH9010') }));
	assert.notDeepEqual(a.position.slice(0, 300), other.position.slice(0, 300));
});

test('a leaf cluster for each leaf asked for, at any age, up to the most a tree carries', () => {
	for (const age of [0.03, 0.3, 1])
		for (const leaves of [0, 1, 17, 45, 72]) {
			const bare = grow(tree({ age, leaves: 0 }));
			const leafy = grow(tree({ age, leaves }));
			assert.equal((leafy.vertices - bare.vertices) / LEAF, leaves, `age ${age}, ${leaves} leaves`);
		}
	const most = grow(tree({ leaves: 500 }));
	assert.equal((most.vertices - grow(tree({ leaves: 0 })).vertices) / LEAF, MAX_LEAVES);
});

test('a tree only ever gains boughs and height as it ages', () => {
	let boughs = 0;
	let height = 0;
	for (let age = 0; age <= 1.0001; age += 0.05) {
		const b = grow(tree({ age, leaves: 0 }));
		assert.ok(b.vertices / BOUGH >= boughs, `boughs at age ${age.toFixed(2)}`);
		assert.ok(b.trees[0].height >= height - 1e-6, `height at age ${age.toFixed(2)}`);
		boughs = b.vertices / BOUGH;
		height = b.trees[0].height;
	}
	assert.equal(grow(tree({ age: 0, leaves: 0 })).vertices / BOUGH, 1, 'a seedling is a single stem');
	assert.ok(boughs > 20, 'a grown tree has its boughs');
	assert.ok(height > 60 && height < 110, `a grown tree is about as tall as asked (100), got ${height}`);
});

test('every index points at a vertex, and nothing is NaN', () => {
	const b = new ForestBuffers();
	for (let i = 0; i < 200; i++) b.add(tree({ seed: i * 7919, age: (i % 20) / 19, leaves: i % 60, x: i * 10, n: -i }), 100, 12);
	for (let i = 0; i < b.indices; i++) assert.ok(b.index[i] < b.vertices);
	for (let i = 0; i < b.vertices * 3; i++) assert.ok(Number.isFinite(b.position[i]));
	assert.equal(b.trees.length, 200);
});
