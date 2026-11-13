import type { GlobeLine } from './lines.js';
import type { GlobeState } from './state.js';
type $$ComponentProps = {
    globe: GlobeState;
    radius: number;
    lines: GlobeLine[];
    fade?: () => number;
};
declare const GlobeLines: import("svelte").Component<$$ComponentProps, {}, "">;
type GlobeLines = ReturnType<typeof GlobeLines>;
export default GlobeLines;
