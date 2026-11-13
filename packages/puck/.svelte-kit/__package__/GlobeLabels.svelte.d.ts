import type { Place } from '@jonibach/geo-puck-data';
import type { GlobeState } from './state.js';
type $$ComponentProps = {
    globe: GlobeState;
    radius: number;
    places: Place[];
    exaggeration: number;
};
declare const GlobeLabels: import("svelte").Component<$$ComponentProps, {}, "">;
type GlobeLabels = ReturnType<typeof GlobeLabels>;
export default GlobeLabels;
