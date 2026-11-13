// Per-frame state the globe's parts share: its size, where the landscape's floor is, the ground
// sampler, and the light. GlobeScene updates it each frame; the parts read it in their own tasks.
import { Color, Vector3 } from 'three';
export class GlobeState {
    /** the globe's radius on screen (scene units): plinth, weather, sun and moon are sized by it */
    R;
    /** the landscape's floor (raw metres): the plinth's top. Eases as the ground under the disc changes. */
    base = NaN;
    /** where the floor is heading: the lowest ground in the disc, less some depth of earth */
    baseGoal = NaN;
    /** ground height at local (x, n), raw metres */
    ground = () => 0;
    /** bumped whenever the landscape re-samples (things draped on it re-drape) */
    version = 0;
    /** where the landscape's grid is centred (local metres) and how far it reaches (metres) */
    patch = { x: NaN, n: NaN, reach: 0 };
    sunDir = new Vector3(0, 1, 0);
    moonDir = new Vector3(0, -1, 0);
    /** colour and strength of the main light (sun by day, moon by night) */
    light = new Color('#ffffff');
    lightDir = new Vector3(0, 1, 0);
    lightStrength = 1;
    /** 0 night … 1 full day */
    daylight = 1;
    weather = null;
    /** 0..1 */
    rain = 0;
    constructor(R) {
        this.R = R;
    }
}
