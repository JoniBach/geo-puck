// The puck: any place on Earth as a terrain diorama on a compass plinth, as Svelte components
// (Three.js through Threlte). <GeoPuck> is the whole thing; PuckState is what it shows.
export { default as GeoPuck } from './Globe.svelte';
export { PuckState, DEFAULTS, FOG_MIN, FOG_MAX, FOG_GAP, type Spot, type Loaded } from './puck.svelte.js';
export { Imagery, SOURCES, type Surface } from './imagery.js';
export { GlobeState, type PuckLayerContext } from './state.js';
export { busy } from './FrameGovernor.svelte';

// layers of your own, for <GeoPuck>'s `layers` snippet
export { default as Forest } from './Forest.svelte';
export { seedOf, MAX_LEAVES, type TreeSpec } from './forest.js';
export { default as Marker } from './Marker.svelte';
