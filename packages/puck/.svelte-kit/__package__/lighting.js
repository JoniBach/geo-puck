// The globe's light, carried from one scene to the next (overview, one day, the next day) and
// eased towards each scene's own light, so the brightness, colour and direction of the light glide
// between days instead of snapping when a new globe takes over.
import { Color, Vector3 } from 'three';
/** The light on the globe right now (null until the first scene sets it). */
export const light = {
    set: false,
    colour: new Color('#fff4e0'),
    strength: 1.375,
    dir: new Vector3(-0.5, 0.75, 0.4).normalize(),
    daylight: 1,
    hemi: 1.4,
    hemiColour: new Color('#dfeef7')
};
/** Ease the carried light towards this scene's goal (about a second to settle); returns it. */
export function easeLight(goal, dt) {
    if (!light.set) {
        light.colour.copy(goal.colour);
        light.strength = goal.strength;
        light.dir.copy(goal.dir);
        light.daylight = goal.daylight;
        light.hemi = goal.hemi;
        light.hemiColour.copy(goal.hemiColour);
        light.set = true;
        return light;
    }
    const k = 1 - Math.exp(-dt * 2.5);
    light.colour.lerp(goal.colour, k);
    light.strength += (goal.strength - light.strength) * k;
    light.dir.lerp(goal.dir, k).normalize();
    light.daylight += (goal.daylight - light.daylight) * k;
    light.hemi += (goal.hemi - light.hemi) * k;
    light.hemiColour.lerp(goal.hemiColour, k);
    return light;
}
