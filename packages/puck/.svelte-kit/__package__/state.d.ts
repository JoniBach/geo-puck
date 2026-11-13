import { Color, Vector3 } from 'three';
import type { LocalPlane, LonLat, WeatherSample } from '@jonibach/geo-puck-data';
export declare class GlobeState {
    /** the globe's radius on screen (scene units): plinth, weather, sun and moon are sized by it */
    readonly R: number;
    /** the landscape's floor (raw metres): the plinth's top. Eases as the ground under the disc changes. */
    base: number;
    /** where the floor is heading: the lowest ground in the disc, less some depth of earth */
    baseGoal: number;
    /** ground height at local (x, n), raw metres */
    ground: (x: number, n: number) => number;
    /** bumped whenever the landscape re-samples (things draped on it re-drape) */
    version: number;
    /** where the landscape's grid is centred (local metres) and how far it reaches (metres) */
    patch: {
        x: number;
        n: number;
        reach: number;
    };
    readonly sunDir: Vector3;
    readonly moonDir: Vector3;
    /** colour and strength of the main light (sun by day, moon by night) */
    readonly light: Color;
    lightDir: Vector3;
    lightStrength: number;
    /** 0 night … 1 full day */
    daylight: number;
    weather: WeatherSample | null;
    /** 0..1 */
    rain: number;
    constructor(R: number);
}
/**
 * What a layer of your own gets (the `layers` snippet of <GeoPuck>). It is drawn inside the land's
 * group: local metres, x east and -z north, y up. Heights are yours to place: a thing standing on
 * the ground at local (x, n) goes at `[x, globe.ground(x, n) * exaggeration, -n]`.
 */
export interface PuckLayerContext {
    /** the ground sampler, the light, the weather: see GlobeState */
    globe: GlobeState;
    /** longitude/latitude to the land's local metres, and back */
    plane: LocalPlane;
    /** the place at the centre */
    spot: LonLat & {
        name: string;
    };
    /** metres from the centre to the rim */
    radius: number;
    /** the vertical exaggeration right now (it runs from 0 as the land rises out of the plinth) */
    exaggeration: number;
    /** the land has finished rising */
    settled: boolean;
    /** how far the land has risen, 0 (flat) to 1 */
    rise: () => number;
}
