import { CanvasTexture, Vector3 } from 'three';
import { type LonLat } from '@jonibach/geo-puck-data';
export type Surface = 'painted' | 'satellite' | 'sentinel' | 'topo';
interface TileSource {
    label: string;
    url: (z: number, x: number, y: number) => string;
    /** the sharpest zoom worth fetching */
    maxZoom: number;
    attribution: string;
    /** a photograph (lifted to sit in the pastel palette), not a printed map */
    photo: boolean;
}
export declare const SOURCES: Record<Exclude<Surface, 'painted'>, TileSource>;
/** The imagery on the land: one canvas texture, painted in as its tiles arrive. */
export declare class Imagery {
    surface: Surface;
    readonly canvas: HTMLCanvasElement;
    readonly texture: CanvasTexture;
    /** texture u, v as affine maps of local metres: u = dot(imgU, (x, n, 1)) */
    readonly imgU: Vector3;
    readonly imgV: Vector3;
    private ctx;
    private generation;
    private centre;
    private reach;
    constructor();
    get mix(): 1 | 0;
    get photo(): boolean;
    get attribution(): string | null;
    /** Show this surface for the land within `reach` metres of a place. */
    show(surface: Surface, centre: LonLat, reach: number): void;
    dispose(): void;
}
export {};
