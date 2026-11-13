import { type HeightAt, type LonLat, type MapData, type Weather } from '@jonibach/geo-puck-data';
import type { Surface } from './imagery.js';
export interface Spot extends LonLat {
    name: string;
}
/** Everything the globe needs for one place, at one size: fetched, then shown. */
export interface Loaded {
    spot: Spot;
    /** metres from the centre to the rim */
    radius: number;
    /** how far the surroundings reach, in radii */
    fogOut: number;
    /** sharp heights for the land (Terrarium z12), coarse ones for the surroundings */
    near: HeightAt;
    far: HeightAt;
    map: MapData;
    weather: Weather | null;
}
export declare const DEFAULTS: {
    radius: number;
    exaggeration: number;
    fogIn: number;
    fogOut: number;
    halo: boolean;
    surface: Surface;
};
export declare const FOG_MIN = 1;
export declare const FOG_MAX = 5;
export declare const FOG_GAP = 0.3;
export declare class PuckState {
    radius: number;
    exaggeration: number;
    fogIn: number;
    fogOut: number;
    halo: boolean;
    surface: Surface;
    layers: {
        contours: boolean;
        roads: boolean;
        water: boolean;
        parks: boolean;
        weather: boolean;
        labels: boolean;
        marker: boolean;
    };
    /** what's on the globe (null: the meadow, before any search) */
    loaded: Loaded | null;
    /** the card with search and settings is open (folded: just a pill) */
    controls: boolean;
    /** being fetched: the old land waits half sunk */
    pending: boolean;
    error: string | null;
    time: number;
    playing: boolean;
    /** seconds of the day per real second */
    rate: number;
    /** a place has landed on the puck (an app might keep it in the address bar) */
    onplace: ((spot: Spot) => void) | null;
    private request;
    /** Fly to a place (or reload the current one at a new size). */
    go(spot: Spot): Promise<void>;
    /** The local day the slider runs through: [start, end) in epoch seconds. */
    get day(): [number, number];
    /** Move the clock on (playing): round and round the same day. */
    advance(dt: number): void;
    /** "14:05" in the place's own time zone */
    clock(t?: number): string;
    /** A place as an address-bar query (?lat=…&lon=…&name=…), so a refresh or a shared link comes back to it. */
    static toQuery(spot: Spot): string;
    /** A place from the address bar, if there is one. */
    static fromUrl(): Spot | null;
}
