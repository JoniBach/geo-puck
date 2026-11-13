import type { Snippet } from 'svelte';
import type { PuckState } from './puck.svelte.js';
import type { PuckLayerContext } from './state.js';
type $$ComponentProps = {
    puck: PuckState;
    /** your own things on the land (trees, routes, pins…): drawn in the land's local metres */
    layers?: Snippet<[PuckLayerContext]>;
    /** the words around the plinth, if not the place's name and where it is */
    lettering?: {
        title: string;
        date: string;
    };
};
declare const Globe: import("svelte").Component<$$ComponentProps, {}, "">;
type Globe = ReturnType<typeof Globe>;
export default Globe;
