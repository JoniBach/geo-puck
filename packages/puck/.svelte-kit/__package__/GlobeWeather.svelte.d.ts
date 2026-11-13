import type { GlobeState } from './state.js';
type $$ComponentProps = {
    globe: GlobeState;
    show: boolean;
    /** 0..1: how settled the weather is (the stage's transitions); 1 when there's no stage */
    presence?: () => number;
};
declare const GlobeWeather: import("svelte").Component<$$ComponentProps, {}, "">;
type GlobeWeather = ReturnType<typeof GlobeWeather>;
export default GlobeWeather;
