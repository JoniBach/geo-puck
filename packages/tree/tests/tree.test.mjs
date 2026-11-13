// Run after a build. DataTree in Node: no renderer is needed to grow it, set values and pick.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DataTree } from '../dist/index.js';

const data = { seed: 'TM0582', branches: [{ id: 'Finches', items: ['Chaffinch', 'Linnet', 'Goldfinch'] }, { id: 'Crows', items: ['Rook', 'Jackdaw'] }] };
const leafCount = (tree) => {
	let n = 0;
	const m = tree.object.children.find((c) => c.userData.leaves);
	for (let i = 0; i < m.count; i++) {
		const e = m.instanceMatrix.array;
		if (Math.hypot(e[i * 16], e[i * 16 + 1], e[i * 16 + 2]) > 0.01) n++;
	}
	return n;
};

test('leaves follow the values: none at zero, more for more, capped', () => {
	const tree = new DataTree(data, { sway: false });
	assert.equal(leafCount(tree), 0, 'no values yet: bare');
	tree.set({ Rook: { value: 4, colour: '#dd9a55' } });
	tree.update(10);
	assert.equal(leafCount(tree), 14, '5 + 4.5 × √4 = 14 leaves');
	tree.set({ Rook: { value: 10000 } });
	tree.update(10);
	assert.equal(leafCount(tree), 48, 'no more than maxLeaves');
	tree.dispose();
});

test('a hit on a leaf, a bud or a limb names what it is', () => {
	const tree = new DataTree(data, { sway: false });
	const leaves = tree.object.children.find((c) => c.userData.leaves);
	const buds = tree.object.children.find((c) => c.userData.buds);
	assert.deepEqual(tree.identify({ object: leaves, instanceId: 0 }), { branch: 'Finches', item: 'Chaffinch' });
	assert.deepEqual(tree.identify({ object: buds, instanceId: 4 }), { branch: 'Crows', item: 'Jackdaw' });
	const wood = tree.object.children.find((c) => c.userData.wood);
	const index = wood.geometry.index.array;
	const named = new Set();
	for (let f = 0; f < index.length; f += 3) named.add(tree.identify({ object: wood, face: { a: index[f] } })?.branch ?? null);
	assert.ok(named.has('Crows') && named.has('Finches') && named.has(null), [...named].join(', '));
	assert.equal(tree.identify({ object: tree.object }), null);
	tree.dispose();
});

test('anchors sit in the crown', () => {
	const tree = new DataTree(data);
	for (const choice of [{ item: 'Linnet' }, { branch: 'Crows' }, {}]) {
		const a = tree.anchor(choice);
		assert.ok(a && a.y > 2 && a.y < 12, JSON.stringify(choice));
	}
	tree.dispose();
});
