import type { Snippet } from 'svelte';
import type { PuckState, Loaded } from './puck.svelte.js';
import type { Imagery } from './imagery.js';
import type { PuckLayerContext } from './state.js';
type $$ComponentProps = {
    puck: PuckState;
    imagery: Imagery;
    layers?: Snippet<[PuckLayerContext]>;
    lettering?: {
        title: string;
        date: string;
    };
    /** the land now on the plinth changed (the sky follows it) */
    onshown: (data: Loaded | null) => void;
    onsky: (top: string, bottom: string) => void;
};
declare const GlobeStage: import("svelte").Component<$$ComponentProps, {}, "">;
type GlobeStage = ReturnType<typeof GlobeStage>;
export default GlobeStage;
