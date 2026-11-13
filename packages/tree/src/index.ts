// A tree as a 3D chart, for Three.js: branches of items grow a tree whose limbs carry the branches
// and whose leaves show the items' values. Every tree is grown afresh from its seed and its data.
export { DataTree, type DataTreeData, type DataTreeBranch, type DataTreeOptions, type ItemValue, type TreeHit } from './DataTree.js';
export { grow, seedOf, rng, type GrowInput, type Skeleton, type TreeNode, type ItemPlace } from './grow.js';
export { woodGeometry, limbs, leafShape } from './wood.js';
