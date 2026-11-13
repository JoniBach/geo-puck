// A puck's state: which place is on it, what's loaded for it, how it's shown, and the time of day.
// Svelte 5 runes ($state): components read these fields and update when they change.
import { formatLonLat, heights, mapAround, weatherFor, zoomFor, type HeightAt, type LonLat, type MapData, type Weather } from '@jonibach/geo-puck-data';
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

export const DEFAULTS = {
	radius: 4000,
	exaggeration: 2,
	fogIn: 1.2,
	fogOut: 2.6,
	halo: true,
	surface: 'painted' as Surface
};
export const FOG_MIN = 1;
export const FOG_MAX = 5;
export const FOG_GAP = 0.3;

export class PuckState {
	// how it's shown
	radius = $state(DEFAULTS.radius);
	exaggeration = $state(DEFAULTS.exaggeration);
	fogIn = $state(DEFAULTS.fogIn);
	fogOut = $state(DEFAULTS.fogOut);
	halo = $state(DEFAULTS.halo);
	surface = $state<Surface>(DEFAULTS.surface);
	layers = $state({ contours: true, roads: true, water: true, parks: true, weather: true, labels: true, marker: true });

	/**
	 * Room taken by the app's own panels at each edge of the puck, in CSS pixels: the picture is
	 * centred in what's left (the camera still turns around the middle of the puck).
	 */
	inset = $state({ left: 0, right: 0, top: 0, bottom: 0 });

	/**
	 * Where the camera is brought down to (null: the whole puck). Setting it flies the camera there
	 * and makes it turn around that point; setting it back to null flies it back out. Each new value
	 * is a new flight, so set a new object rather than changing one in place.
	 */
	focus = $state.raw<PuckFocus | null>(null);

	/** what's on the globe (null: the meadow, before any search) */
	loaded = $state.raw<Loaded | null>(null);
	/** the card with search and settings is open (folded: just a pill) */
	controls = $state(true);
	/** being fetched: the old land waits half sunk */
	pending = $state(false);
	error = $state<string | null>(null);

	// the time of day (epoch seconds), and playing through it
	time = $state(Date.now() / 1000);
	playing = $state(false);
	/** seconds of the day per real second */
	rate = $state(600);

	/** a place has landed on the puck (an app might keep it in the address bar) */
	onplace: ((spot: Spot) => void) | null = null;

	private request = 0;

	/** Fly to a place (or reload the current one at a new size). */
	async go(spot: Spot) {
		const id = ++this.request;
		this.pending = true;
		this.error = null;
		const radius = this.radius;
		const fogOut = this.fogOut;
		const reach = radius * fogOut * 1.05;
		try {
			// everything at once: elevation for the land and the surroundings, the map, the weather
			const [near, far, map, weather] = await Promise.all([
				// as sharp as the tiles go (z12) for a puck of a few km; coarser as it widens, so a
				// regional puck (tens of km) still loads a handful of tiles
				heights(spot, radius * 1.1, zoomFor(radius * 1.1, spot.lat, 5, 12)),
				heights(spot, reach, reach <= 9000 ? 11 : reach <= 20000 ? 10 : reach <= 45000 ? 9 : zoomFor(reach, spot.lat, 4, 8)),
				mapAround(spot, radius * 1.1, reach),
				weatherFor(spot)
			]);
			if (id !== this.request) return; // a newer search won
			if (!Number.isFinite(near(0, 0))) throw new Error('no elevation data there');
			const same = this.loaded?.spot === spot;
			this.loaded = { spot, radius, fogOut, near, far, map, weather };
			// a new place starts at its own "now"; a new size keeps the time you'd chosen
			if (!same) this.time = Date.now() / 1000;
			this.onplace?.(spot);
		} catch (e) {
			if (id === this.request) this.error = `Couldn't load ${spot.name}: ${(e as Error).message}`;
		} finally {
			if (id === this.request) this.pending = false;
		}
	}

	/** The local day the slider runs through: [start, end) in epoch seconds. */
	get day(): [number, number] {
		const w = this.loaded?.weather;
		// no weather (offline): the time zone from the longitude, near enough
		const offset = w?.utcOffset ?? Math.round((this.loaded?.spot.lon ?? 0) / 15) * 3600;
		const start = w?.dayStart ?? Math.floor((this.time + offset) / 86400) * 86400 - offset;
		return [start, start + 86400];
	}

	/** Move the clock on (playing): round and round the same day. */
	advance(dt: number) {
		if (!this.playing) return;
		const [a, b] = this.day;
		let t = this.time + dt * this.rate;
		if (t >= b) t = a + ((t - a) % 86400);
		this.time = t;
	}

	/** "14:05" in the place's own time zone */
	clock(t = this.time) {
		const w = this.loaded?.weather;
		const offset = w?.utcOffset ?? Math.round((this.loaded?.spot.lon ?? 0) / 15) * 3600;
		return new Date((t + offset) * 1000).toISOString().slice(11, 16);
	}

	/** A place as an address-bar query (?lat=…&lon=…&name=…), so a refresh or a shared link comes back to it. */
	static toQuery(spot: Spot) {
		return `?${new URLSearchParams({ lat: spot.lat.toFixed(5), lon: spot.lon.toFixed(5), name: spot.name })}`;
	}

	/** A place from the address bar, if there is one. */
	static fromUrl(): Spot | null {
		const q = new URLSearchParams(location.search);
		const lat = parseFloat(q.get('lat') ?? '');
		const lon = parseFloat(q.get('lon') ?? '');
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
		return { lat, lon, name: q.get('name') || formatLonLat({ lon, lat }, 3) };
	}
}
