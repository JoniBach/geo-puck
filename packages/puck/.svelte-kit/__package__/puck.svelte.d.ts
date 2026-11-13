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
/**
 * Somewhere on the land for the camera to come down to and turn around, like standing beside it.
 * In the land's own metres: x east and n north of the centre, `height` above the ground there.
 */
export interface PuckFocus {
    x: number;
    n: number;
    /** metres above the ground (the point the camera turns around); default 0 */
    height?: number;
    /**
     * a step from that point, in metres east, up and north, without following the ground: for a
     * point on something standing at (x, n), such as a leaf on a tree; default none
     */
    offset?: [number, number, number];
    /** how far the camera stands from it, in metres; default a tenth of the radius */
    distance?: number;
    /** the camera's angle down from straight overhead, in radians: about 1.3 is near eye level; default 1.25 */
    polar?: number;
    /** which side to stand on: the compass direction from the point to the camera, in radians east of north; default: stay on the side it is */
    bearing?: number;
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
    /**
     * Room taken by the app's own panels at each edge of the puck, in CSS pixels: the picture is
     * centred in what's left (the camera still turns around the middle of the puck).
     */
    inset: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
    /**
     * Where the camera is brought down to (null: the whole puck). Setting it flies the camera there
     * and makes it turn around that point; setting it back to null flies it back out. Each new value
     * is a new flight, so set a new object rather than changing one in place.
     */
    focus: PuckFocus | null;
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
