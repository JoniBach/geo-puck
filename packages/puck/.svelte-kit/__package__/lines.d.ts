import type { MapData } from '@jonibach/geo-puck-data';
export interface GlobeLine {
    /** local metres: x, n, x, n, … */
    xy: Float32Array;
    /** half-width on the land, as a share of the globe's radius */
    half: number;
    color: [number, number, number];
    alpha: number;
    /** how it shows beyond the rim */
    haloColor: [number, number, number];
    haloAlpha: number;
    dash: boolean;
}
export declare function globeLines(map: MapData, show: {
    roads: boolean;
    rivers: boolean;
    parks: boolean;
}): GlobeLine[];
