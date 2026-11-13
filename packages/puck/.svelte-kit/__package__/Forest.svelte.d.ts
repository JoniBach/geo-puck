import { type TreeSpec } from './forest.js';
import type { PuckLayerContext } from './state.js';
type $$ComponentProps = {
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
};
declare const Forest: import("svelte").Component<$$ComponentProps, {}, "">;
type Forest = ReturnType<typeof Forest>;
export default Forest;
