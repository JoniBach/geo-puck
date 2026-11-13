# @jonibach/data-tree

A tree as a 3D chart, for Three.js. Give it groups of items and it grows a tree: each group becomes
a limb, each item a cluster of leaves at the end of its own twigs, and each item's value sets how
many leaves it holds. An item with no value shows a bud. Values and colours can change at any time,
and the leaves ease to match, so a tree can be played through time.

The wood is grown from the data, not drawn by hand, and every tree is unique to its seed: the same
seed and data always grow the same tree, and another seed grows another.

Plain Three.js with no framework. `tree.object` is an ordinary `Group`.

## Use it

```ts
import { DataTree } from '@jonibach/data-tree';

const tree = new DataTree({
	seed: 'TL8782',
	branches: [
		{ id: 'Finches', items: ['Chaffinch', 'Linnet', 'Goldfinch'] },
		{ id: 'Crows', items: ['Rook', 'Jackdaw'] }
	]
});
scene.add(tree.object);

tree.set({ Rook: { value: 81, colour: '#dd9a55' }, Linnet: { value: 3, colour: '#8fbd73' } });

renderer.setAnimationLoop(() => {
	tree.update(clock.getDelta()); // eases the leaves, moves the wind on
	renderer.render(scene, camera);
});
```

| Method | What it does |
| --- | --- |
| `set(values)` | Sets items' values and leaf colours, by item id. Items not named keep theirs |
| `choose({ branch, item })` | Brings out one group or one item; the rest pales and its leaves shrink back. `null` clears it |
| `update(dt)` | Eases leaves, buds and colours towards what was set. Returns true while they are still changing |
| `identify(hit)` | Names what a raycast hit: `{ branch, item }` for leaves or a bud, `{ branch, item: null }` for a group's limb, both null for the trunk |
| `anchor({ branch?, item? })` | Where an item's leaves gather, or the middle of a group's limb, in the tree's own space: somewhere to point a camera |
| `dispose()` | Frees the geometry and materials |

| Option | Meaning | Default |
| --- | --- | --- |
| `height` | The tree's height, in scene units | 10 |
| `maxLeaves` | The most leaves one item can hold | 48 |
| `leavesFor` | How many leaves a value is worth | 5 + 4.5 × √value; none for 0 |
| `leafSize` | One leaf's length | 0.55 × height / 10 |
| `bark`, `bud` | Colours of the wood and of buds | warm brown, grey-brown |
| `fade` | What the rest fades towards while something is chosen: usually the background | paper |
| `sway` | Move in the wind | true, or false when the system asks for less motion |

## How the wood grows

The wood grows by space colonisation (Runions, Lane and Prusinkiewicz, 2007):

1. **Places in the crown.** Each item gets a place in an egg-shaped crown above the trunk. Groups take wedges of the crown as wide as their share of the items, so a group's items come out on one side, on a limb of their own.
2. **Attraction points.** Each item's place gets a small cloud of attraction points around it.
3. **Growth.** From the top of the trunk, each growing tip steps towards the attraction points near it, with a little reach for the light and a little wander. Points are used up when wood reaches them. Items close together share wood until they part, which is what makes it look grown rather than drawn.
4. **Thickness.** Limbs follow the pipe model: a limb is as thick as the twigs it feeds, together.
5. **Tubes.** The wood is built as continuous tubes, one per limb, kept from twisting by parallel transport.

The seed sets the crown's proportions, where each wedge starts, and every jitter along the way.
`grow()` returns the skeleton on its own, for anyone wanting to draw it differently.

## Leaves

Each item has a fixed set of leaf places along its twigs, tips first. A value fills them in order,
so a rising value adds leaves without moving the ones already there. Each leaf is a small folded
blade at its own angle and shade, and leaves flutter in the wind in the vertex shader.

## Words used here

- **Branch**: a group of items. It becomes a limb of the tree.
- **Item**: one thing in a group, shown by its leaves.
- **Value**: an item's number. It sets how many leaves the item holds.
- **Seed**: a name or number that decides the tree's shape. The same seed and data always grow the same tree.
- **Space colonisation**: a way of growing branching shapes towards a set of target points.
- **Pipe model**: the rule that a limb's cross-section matches the twigs it feeds put together.
