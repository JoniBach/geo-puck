import { Color, Vector3 } from 'three';
export interface LightGoal {
    /** direct light: colour, strength (0..~1.4) and where it comes from (unit vector) */
    colour: Color;
    strength: number;
    dir: Vector3;
    /** 0 night .. 1 day: the land's sky fill */
    daylight: number;
    /** the soft sky light: intensity and colour */
    hemi: number;
    hemiColour: Color;
}
/** The light on the globe right now (null until the first scene sets it). */
export declare const light: LightGoal & {
    set: boolean;
};
/** Ease the carried light towards this scene's goal (about a second to settle); returns it. */
export declare function easeLight(goal: LightGoal, dt: number): LightGoal & {
    set: boolean;
};
