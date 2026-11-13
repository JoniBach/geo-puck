export interface TreeSpec {
    /** yours, handed back when the tree is pointed at or picked */
    id?: string;
    /** where it stands: local metres, x east and n north of the puck's centre */
    x: number;
    n: number;
    /** any whole number (seedOf('TL8782') turns a name into one) */
    seed: number;
    /** 0 a seedling … 1 fully grown */
    age: number;
    /** clusters of leaves (0: bare) */
    leaves: number;
    /** leaf colour, sRGB 0..1 */
    colour: [number, number, number];
    /** its height when fully grown, relative to the forest's (default 1) */
    size?: number;
    /** bark colour, sRGB 0..1 (default a warm grey-brown) */
    bark?: [number, number, number];
}
/** A whole number from a name: the same name always grows the same tree. */
export declare function seedOf(name: string): number;
/** The most leaf clusters a tree can carry: more than this are not drawn. */
export declare const MAX_LEAVES = 96;
/** Growable buffers for one merged mesh: every tree's vertices, relative to where it stands. */
export declare class ForestBuffers {
    /** relative to the tree's foot */
    position: Float32Array<ArrayBuffer>;
    /** linear RGB */
    color: Float32Array<ArrayBuffer>;
    /** the tree's foot (x, ground height, z) for each vertex: the shader stands the tree on it */
    base: Float32Array<ArrayBuffer>;
    index: Uint32Array<ArrayBuffer>;
    vertices: number;
    indices: number;
    /** for each tree: where it stands and how tall it is now (for pointing at it) */
    trees: {
        spec: TreeSpec;
        height: number;
    }[];
    reset(): void;
    private room;
    /** a tapered four-sided bough from a to b */
    private bough;
    /** a cluster of leaves: a slightly squashed icosahedron (flat-shaded, so it reads as faceted foliage) */
    private leaf;
    /**
     * Add one tree. `height` is a full-grown tree's height in the land's metres; `ground` the
     * height of the land under it (raw metres: the shader applies the vertical exaggeration).
     */
    add(spec: TreeSpec, height: number, ground: number): void;
}
