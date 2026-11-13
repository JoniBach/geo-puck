import type { PuckState, Loaded } from './puck.svelte.js';
import type { Imagery } from './imagery.js';
import type { GlobeState } from './state.js';
type $$ComponentProps = {
    puck: PuckState;
    data: Loaded;
    globe: GlobeState;
    imagery: Imagery;
    /** 1 the land shows, 0 it has faded away (the stage's transitions) */
    fade?: () => number;
};
declare const DioramaTerrain: import("svelte").Component<$$ComponentProps, {}, "">;
type DioramaTerrain = ReturnType<typeof DioramaTerrain>;
export default DioramaTerrain;
