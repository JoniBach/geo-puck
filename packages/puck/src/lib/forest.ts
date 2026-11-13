// A generative forest: one tree for each point. Every tree is grown from its own seed (the same
// seed always gives the same tree), and three things about it are yours to drive with data:
//
//   age     0 a seedling … 1 fully grown: the trunk thickens and the boughs come out one by one
//   leaves  how many clusters of leaves it carries (0: bare)
//   colour  the colour of those leaves
//
// A tree's skeleton (which bough leaves which, at what angle) is fixed by the seed and worked out
// once; age only decides how far along each bough has grown. So a tree keeps its character as it
// grows, and moving a slider grows a forest smoothly rather than re-rolling it.

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
export function seedOf(name: string) {
	let h = 2166136261;
	for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
	return h >>> 0;
}

/** a small seeded random number generator (mulberry32): 0..1 */
function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

interface Bough {
	parent: number;
	/** how far along its parent it leaves (0 base … 1 tip) */
	at: number;
	/** unit direction */
	dx: number;
	dy: number;
	dz: number;
	/** full-grown length and thickness at its base, as shares of the tree's height */
	len: number;
	rad: number;
	level: number;
	/** the age at which it starts to grow */
	birth: number;
}
interface LeafSite {
	bough: number;
	at: number;
	/** offset from the bough, shares of the tree's height */
	ox: number;
	oy: number;
	oz: number;
	size: number;
	shade: number;
}
interface Skeleton {
	boughs: Bough[];
	/** in the order they fill: tips first */
	sites: LeafSite[];
}

const skeletons = new Map<number, Skeleton>();
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
/** how long (in age) a bough takes to reach its length */
const SPAN = 0.22;

/** A direction `tilt` radians away from (dx, dy, dz), turned `turn` radians around it. */
function lean(dx: number, dy: number, dz: number, tilt: number, turn: number): [number, number, number] {
	// two unit vectors square to the direction
	let ux = -dz;
	let uy = 0;
	let uz = dx;
	let ul = Math.hypot(ux, uz);
	if (ul < 1e-4) {
		ux = 1;
		uz = 0;
		ul = 1;
	}
	ux /= ul;
	uz /= ul;
	const vx = dy * uz - dz * uy;
	const vy = dz * ux - dx * uz;
	const vz = dx * uy - dy * ux;
	const s = Math.sin(tilt);
	const c = Math.cos(tilt);
	const ct = Math.cos(turn);
	const st = Math.sin(turn);
	return [dx * c + (ux * ct + vx * st) * s, dy * c + (uy * ct + vy * st) * s, dz * c + (uz * ct + vz * st) * s];
}

function skeleton(seed: number): Skeleton {
	const cached = skeletons.get(seed);
	if (cached) return cached;
	const r = rng(seed);
	const between = (a: number, b: number) => a + (b - a) * r();
	const boughs: Bough[] = [];
	const sites: LeafSite[] = [];

	// the trunk, leaning a little
	const [tx, ty, tz] = lean(0, 1, 0, between(0, 0.12), between(0, Math.PI * 2));
	boughs.push({ parent: -1, at: 0, dx: tx, dy: ty, dz: tz, len: between(0.38, 0.48), rad: between(0.036, 0.046), level: 0, birth: 0 });

	const grow = (parent: number, count: number, from: number, tilt: [number, number], shrink: [number, number], wait: [number, number]) => {
		const p = boughs[parent];
		const spin = between(0, Math.PI * 2);
		for (let i = 0; i < count; i++) {
			const at = count === 1 ? 1 : from + ((1 - from) * i) / (count - 1);
			let [dx, dy, dz] = lean(p.dx, p.dy, p.dz, between(tilt[0], tilt[1]), spin + i * GOLDEN + between(-0.4, 0.4));
			// boughs reach for the light: never much below level
			if (dy < 0.08) {
				dy = 0.08 + r() * 0.1;
				const l = Math.hypot(dx, dy, dz);
				dx /= l;
				dy /= l;
				dz /= l;
			}
			boughs.push({
				parent,
				at,
				dx,
				dy,
				dz,
				len: p.len * between(shrink[0], shrink[1]),
				rad: p.rad * between(0.54, 0.66),
				level: p.level + 1,
				// the lower ones come first
				birth: p.birth + wait[0] + (wait[1] - wait[0]) * (count === 1 ? 0.5 : i / (count - 1)) + between(-0.02, 0.02)
			});
		}
	};

	// main boughs up the top half of the trunk, the last carrying on as its leader
	const mains = 4 + Math.floor(r() * 3);
	grow(0, mains, 0.5, [0.6, 1.15], [0.62, 0.86], [0.04, 0.2]);
	boughs[boughs.length - 1].dx = tx * 0.9 + between(-0.15, 0.15);
	boughs[boughs.length - 1].dz = tz * 0.9 + between(-0.15, 0.15);
	boughs[boughs.length - 1].dy = 1;
	{
		const b = boughs[boughs.length - 1];
		const l = Math.hypot(b.dx, b.dy, b.dz);
		b.dx /= l;
		b.dy /= l;
		b.dz /= l;
	}
	const l1 = boughs.length;
	for (let i = 1; i < l1; i++) grow(i, 2 + Math.floor(r() * 2), 0.45, [0.4, 0.8], [0.55, 0.7], [0.08, 0.18]);
	const l2 = boughs.length;
	for (let i = l1; i < l2; i++) grow(i, 2, 0.55, [0.35, 0.7], [0.55, 0.7], [0.07, 0.15]);

	// where leaves can sit: the tips of the finest twigs first, then back along the boughs
	const site = (bough: number, at: number, spread: number): LeafSite => ({
		bough,
		at,
		ox: between(-spread, spread),
		oy: between(-spread * 0.4, spread),
		oz: between(-spread, spread),
		size: between(0.8, 1.25),
		shade: between(-1, 1)
	});
	const shuffled = <T>(list: T[]) => {
		for (let i = list.length - 1; i > 0; i--) {
			const j = Math.floor(r() * (i + 1));
			[list[i], list[j]] = [list[j], list[i]];
		}
		return list;
	};
	const tips: LeafSite[] = [];
	const inner: LeafSite[] = [];
	const filler: LeafSite[] = [];
	for (let i = l2; i < boughs.length; i++) tips.push(site(i, 1, 0.012));
	for (let i = l1; i < l2; i++) inner.push(site(i, 1, 0.015));
	for (let i = l2; i < boughs.length; i++) inner.push(site(i, 0.5, 0.02));
	for (let i = 1; i < boughs.length; i++) filler.push(site(i, between(0.55, 0.95), 0.035));
	// (alternate tips and inner sites early on, so a thin canopy is thin all over, not lopsided)
	sites.push(...shuffled(tips), ...shuffled(inner), ...shuffled(filler));

	const made = { boughs, sites };
	skeletons.set(seed, made);
	if (skeletons.size > 4000) skeletons.delete(skeletons.keys().next().value!);
	return made;
}

/** The most leaf clusters a tree can carry: more than this are not drawn. */
export const MAX_LEAVES = 96;

// ---- geometry --------------------------------------------------------------------------------

/** Growable buffers for one merged mesh: every tree's vertices, relative to where it stands. */
export class ForestBuffers {
	/** relative to the tree's foot */
	position = new Float32Array(3 * 4096);
	/** linear RGB */
	color = new Float32Array(3 * 4096);
	/** the tree's foot (x, ground height, z) for each vertex: the shader stands the tree on it */
	base = new Float32Array(3 * 4096);
	index = new Uint32Array(3 * 8192);
	vertices = 0;
	indices = 0;
	/** for each tree: where it stands and how tall it is now (for pointing at it) */
	trees: { spec: TreeSpec; height: number }[] = [];

	reset() {
		this.vertices = 0;
		this.indices = 0;
		this.trees = [];
	}
	private room(v: number, i: number) {
		if ((this.vertices + v) * 3 > this.position.length) {
			const size = Math.max(this.position.length * 2, (this.vertices + v) * 3);
			for (const key of ['position', 'color', 'base'] as const) {
				const next = new Float32Array(size);
				next.set(this[key]);
				this[key] = next;
			}
		}
		if (this.indices + i > this.index.length) {
			const next = new Uint32Array(Math.max(this.index.length * 2, this.indices + i));
			next.set(this.index);
			this.index = next;
		}
	}

	/** a tapered four-sided bough from a to b */
	private bough(ax: number, ay: number, az: number, bx: number, by: number, bz: number, ra: number, rb: number, c: number[], foot: number[]) {
		this.room(8, 24);
		let dx = bx - ax;
		let dy = by - ay;
		let dz = bz - az;
		const l = Math.hypot(dx, dy, dz) || 1;
		dx /= l;
		dy /= l;
		dz /= l;
		// two directions square to the bough
		let ux = -dz;
		let uz = dx;
		let ul = Math.hypot(ux, uz);
		if (ul < 1e-4) {
			ux = 1;
			uz = 0;
			ul = 1;
		}
		ux /= ul;
		uz /= ul;
		const vx = dy * uz;
		const vy = dz * ux - dx * uz;
		const vz = -dy * ux;
		const v0 = this.vertices;
		for (let end = 0; end < 2; end++) {
			const [px, py, pz, rr] = end ? [bx, by, bz, rb] : [ax, ay, az, ra];
			for (let k = 0; k < 4; k++) {
				const cs = k === 0 ? 1 : k === 2 ? -1 : 0;
				const sn = k === 1 ? 1 : k === 3 ? -1 : 0;
				const o = this.vertices * 3;
				this.position[o] = px + (ux * cs + vx * sn) * rr;
				this.position[o + 1] = py + vy * sn * rr;
				this.position[o + 2] = pz + (uz * cs + vz * sn) * rr;
				// darker towards the ground
				const shade = end ? 1 : 0.86;
				this.color[o] = c[0] * shade;
				this.color[o + 1] = c[1] * shade;
				this.color[o + 2] = c[2] * shade;
				this.base[o] = foot[0];
				this.base[o + 1] = foot[1];
				this.base[o + 2] = foot[2];
				this.vertices++;
			}
		}
		for (let k = 0; k < 4; k++) {
			const a = v0 + k;
			const b = v0 + ((k + 1) % 4);
			const i = this.indices;
			// (wound so each face looks outwards)
			this.index[i] = a;
			this.index[i + 1] = b;
			this.index[i + 2] = a + 4;
			this.index[i + 3] = b;
			this.index[i + 4] = b + 4;
			this.index[i + 5] = a + 4;
			this.indices += 6;
		}
	}

	/** a cluster of leaves: a slightly squashed icosahedron (flat-shaded, so it reads as faceted foliage) */
	private leaf(x: number, y: number, z: number, radius: number, turn: number, c: number[], foot: number[]) {
		this.room(12, 60);
		const v0 = this.vertices;
		const cs = Math.cos(turn);
		const sn = Math.sin(turn);
		for (let k = 0; k < 12; k++) {
			const px = ICO[k * 3];
			const py = ICO[k * 3 + 1];
			const pz = ICO[k * 3 + 2];
			const o = this.vertices * 3;
			this.position[o] = x + (px * cs - pz * sn) * radius;
			this.position[o + 1] = y + py * radius * 0.82;
			this.position[o + 2] = z + (px * sn + pz * cs) * radius;
			// lighter on top, as leaves are
			const shade = 0.9 + 0.14 * py;
			this.color[o] = c[0] * shade;
			this.color[o + 1] = c[1] * shade;
			this.color[o + 2] = c[2] * shade;
			this.base[o] = foot[0];
			this.base[o + 1] = foot[1];
			this.base[o + 2] = foot[2];
			this.vertices++;
		}
		for (let k = 0; k < 60; k++) this.index[this.indices++] = v0 + ICO_FACES[k];
	}

	/**
	 * Add one tree. `height` is a full-grown tree's height in the land's metres; `ground` the
	 * height of the land under it (raw metres: the shader applies the vertical exaggeration).
	 */
	add(spec: TreeSpec, height: number, ground: number) {
		const { boughs, sites } = skeleton(spec.seed);
		const age = Math.min(1, Math.max(0, spec.age));
		// a seedling is already a third the size of a grown tree: small, but there to be seen
		const H = height * (spec.size ?? 1) * (0.34 + 0.66 * age ** 0.75);
		const foot = [spec.x, ground, -spec.n];
		const bark = toLinear(spec.bark ?? BARK);
		const thick = 0.45 + 0.55 * age;

		// each bough's start and end, now
		const n = boughs.length;
		const sx = new Float32Array(n);
		const sy = new Float32Array(n);
		const sz = new Float32Array(n);
		const ex = new Float32Array(n);
		const ey = new Float32Array(n);
		const ez = new Float32Array(n);
		const out = new Float32Array(n);
		let top = 0;
		for (let i = 0; i < n; i++) {
			const b = boughs[i];
			const u = i === 0 ? 1 : Math.min(1, Math.max(0, (age - b.birth) / SPAN));
			const g = u * u * (3 - 2 * u);
			out[i] = b.parent < 0 ? 1 : Math.min(g, out[b.parent] > 0.3 ? 1 : 0);
			if (out[i] <= 0) continue;
			if (b.parent >= 0) {
				const p = b.parent;
				sx[i] = sx[p] + (ex[p] - sx[p]) * b.at;
				sy[i] = sy[p] + (ey[p] - sy[p]) * b.at;
				sz[i] = sz[p] + (ez[p] - sz[p]) * b.at;
			}
			const len = b.len * H * out[i];
			ex[i] = sx[i] + b.dx * len;
			ey[i] = sy[i] + b.dy * len;
			ez[i] = sz[i] + b.dz * len;
			if (ey[i] > top) top = ey[i];
			const r0 = b.rad * H * thick * (i === 0 ? 1 : 0.4 + 0.6 * out[i]);
			this.bough(sx[i], sy[i], sz[i], ex[i], ey[i], ez[i], r0, r0 * (b.level === 2 ? 0.35 : 0.58), bark, foot);
		}

		// leaves: on the boughs that are out; a young tree with more to carry holds them in a ball at its top
		const want = Math.min(MAX_LEAVES, Math.max(0, Math.round(spec.leaves)));
		const leafR = H * 0.088;
		const leaf = toLinear(spec.colour);
		const c = [0, 0, 0];
		let placed = 0;
		for (let k = 0; k < sites.length && placed < want; k++) {
			const s = sites[k];
			if (out[s.bough] < 0.35) continue;
			const i = s.bough;
			tint(leaf, s.shade, c);
			const px = sx[i] + (ex[i] - sx[i]) * s.at + s.ox * H;
			const py = sy[i] + (ey[i] - sy[i]) * s.at + s.oy * H;
			const pz = sz[i] + (ez[i] - sz[i]) * s.at + s.oz * H;
			this.leaf(px, py, pz, leafR * s.size * (0.75 + 0.25 * out[i]), s.shade * 3, c, foot);
			if (py + leafR > top) top = py + leafR;
			placed++;
		}
		if (placed < want) {
			const r = rng(spec.seed ^ 0x9e3779b9);
			const crown = H * (0.1 + 0.02 * Math.sqrt(want));
			for (; placed < want; placed++) {
				// evenly through a ball around the tip of the trunk
				const u = r() * 2 - 1;
				const t = r() * Math.PI * 2;
				const rr = crown * Math.cbrt(r());
				const q = Math.sqrt(1 - u * u);
				tint(leaf, r() * 2 - 1, c);
				const py = ey[0] + rr * u * 0.8 + crown * 0.35;
				this.leaf(ex[0] + rr * q * Math.cos(t), py, ez[0] + rr * q * Math.sin(t), leafR * (0.8 + 0.45 * r()), t, c, foot);
				if (py + leafR > top) top = py + leafR;
			}
		}
		this.trees.push({ spec, height: top });
	}
}

const BARK: [number, number, number] = [0.43, 0.36, 0.3];
const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toLinear = (c: [number, number, number]) => [lin(c[0]), lin(c[1]), lin(c[2])];
/** a leaf colour a touch lighter or darker (shade -1..1), so a canopy isn't one flat colour */
function tint(c: number[], shade: number, out: number[]) {
	const k = 1 + shade * 0.13;
	out[0] = c[0] * k;
	out[1] = c[1] * k;
	out[2] = c[2] * k;
}

// a unit icosahedron
const T = (1 + Math.sqrt(5)) / 2;
const ICO = (() => {
	const v = [-1, T, 0, 1, T, 0, -1, -T, 0, 1, -T, 0, 0, -1, T, 0, 1, T, 0, -1, -T, 0, 1, -T, T, 0, -1, T, 0, 1, -T, 0, -1, -T, 0, 1];
	const l = Math.hypot(1, T);
	return v.map((x) => x / l);
})();
// prettier-ignore
const ICO_FACES = [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8, 3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1];
