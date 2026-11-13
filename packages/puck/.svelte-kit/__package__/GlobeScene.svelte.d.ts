import type { Snippet } from 'svelte';
import type { PuckState, Loaded } from './puck.svelte.js';
import type { Imagery } from './imagery.js';
import { type PuckLayerContext } from './state.js';
import type { OrbitControls as Controls } from 'three/examples/jsm/controls/OrbitControls.js';
type $$ComponentProps = {
    /** the camera's controls (the stage's): flown to the puck's focus */
    controls?: Controls;
    puck: PuckState;
    data: Loaded;
    imagery: Imagery;
    layers?: Snippet<[PuckLayerContext]>;
    onsky: (top: string, bottom: string) => void;
    /** how dark the plinth's shadow should be */
    onshadow: (s: number) => void;
    /** how far the relief has risen out of the plinth, 0 (flat) to 1: the stage's transitions */
    rise: () => number;
};
declare const GlobeScene: import("svelte").Component<$$ComponentProps, {}, "">;
type GlobeScene = ReturnType<typeof GlobeScene>;
export default GlobeScene;
