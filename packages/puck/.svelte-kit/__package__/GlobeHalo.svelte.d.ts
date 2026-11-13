import type { HeightAt } from '@jonibach/geo-puck-data';
import type { GlobeLine } from './lines.js';
import type { GlobeState } from './state.js';
type $$ComponentProps = {
    globe: GlobeState;
    radius: number;
    /** coarse heights reaching out to the surroundings' edge */
    heights: HeightAt;
    contours: boolean;
    /** the map's lines (roads, rivers, park edges) to carry on past the rim */
    lines: GlobeLine[];
    /** how far the surroundings have opened out from the rim, 0 to 1, like an aperture (the stage's transitions) */
    open?: () => number;
    /** where the surroundings begin (a crisp edge, then a short fade-in), in multiples of the radius (live) */
    fogIn?: number;
    /** where the outer fog has closed in, and how far the surroundings reach (a new value rebuilds) */
    fogOut?: number;
};
declare const GlobeHalo: import("svelte").Component<$$ComponentProps, {}, "">;
type GlobeHalo = ReturnType<typeof GlobeHalo>;
export default GlobeHalo;
