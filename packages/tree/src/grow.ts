// Growing a tree's wood from its data, by space colonisation (Runions, Lane and Prusinkiewicz,
// "Modeling Trees with a Space Colonization Algorithm", 2007).
//
// Every item in the data gets a place in the crown, its "site", and a little cloud of attraction
// points around it. The wood then grows towards those points a step at a time: each growing tip
// is pulled by the points nearest to it, and points are used up once wood reaches them. So the
// boughs are not drawn by hand: they find their own way to every item, sharing wood where items
// sit together and parting where they don't, which is what makes the result look grown.
//
// Branches (the groups the items belong to) each take a wedge of the crown, so a group's items
// come out on one limb of the tree, and pointing at that limb means that group. The seed decides
// the crown's proportions, where each wedge starts, and every small jitter: the same data and seed
// always grow the same tree; another seed grows another.

export type Vec = [number, number, number];

export interface GrowItem {
	id: string;
	/** the branch (group) it belongs to, as an index into `branches` */
	branch: number;
}
export interface GrowInput {
	seed: number;
	/** branch ids, in order round the crown */
	branches: string[];
	items: GrowItem[];
	/** the tree's height, in the units it's drawn in; default 10 */
	height?: number;
}

export interface TreeNode {
	p: Vec;
	/** -1 for the root */
	parent: number;
	children: number[];
	/** set once the wood is grown: pipe-model thickness */
	radius: number;
	/** the item whose attraction grew it (-1: trunk) */
	item: number;
	/** the one branch all the wood beyond it serves, or -1 where branches share it */
	branch: number;
	/** every branch the wood beyond it serves */
	serves: number[];
}
export interface ItemPlace {
	/** where its leaves gather, in the crown */
	site: Vec;
	/** the wood grown towards it, nearest the site first (its leaves hang from these) */
	nodes: number[];
}
export interface Skeleton {
	nodes: TreeNode[];
	items: ItemPlace[];
	height: number;
	/** the crown's half-width */
	spread: number;
}

/** a small seeded random number generator (mulberry32): 0..1 */
export function rng(seed: number) {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A whole number from a name: the same name always grows the same tree. */
export function seedOf(name: string) {
	let h = 2166136261;
	for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619);
	return h >>> 0;
}

const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: Vec) => Math.hypot(a[0], a[1], a[2]);
const dist2 = (a: Vec, b: Vec) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;

export function grow(input: GrowInput): Skeleton {
	const r = rng(input.seed);
	const between = (a: number, b: number) => a + (b - a) * r();
	const H = input.height ?? 10;
	const N = Math.max(1, input.items.length);
	const S = H / 10; // everything below is worked out for a tree 10 tall

	// ---- the crown: an egg shape above the trunk, wider for more items --------------------------
	const trunk = H * between(0.3, 0.4);
	const spread = Math.min(H * 0.55, (2.1 + 0.32 * Math.sqrt(N)) * S) * between(0.9, 1.1);
	const crownMid = trunk + (H - trunk) * 0.5;
	const crownHalf = (H - trunk) * 0.5;
	const lean: Vec = [between(-0.04, 0.04) * H, 0, between(-0.04, 0.04) * H];

	// each branch a wedge of the crown, as wide as its share of the items
	const counts = input.branches.map((_, b) => input.items.filter((it) => it.branch === b).length);
	const start = between(0, Math.PI * 2);
	const wedge: [number, number][] = [];
	let at = start;
	for (const c of counts) {
		const w = (c / N) * Math.PI * 2;
		wedge.push([at, w]);
		at += w;
	}

	// each item a site in its branch's wedge: spread round the wedge, and up and down the crown
	const placed = new Array(input.branches.length).fill(0);
	const items: ItemPlace[] = input.items.map((it) => {
		const [a0, w] = wedge[it.branch];
		const j = placed[it.branch]++;
		const c = counts[it.branch];
		const theta = a0 + w * ((j + 0.5) / c) + between(-0.25, 0.25) * (w / c);
		// heights by the golden ratio, so a branch's items never line up in a row
		const v = (j * 0.618034 + r()) % 1;
		const phi = (0.18 + 0.62 * v) * Math.PI; // from near the top to a little below the middle
		const reach = between(0.72, 0.98);
		const site: Vec = [
			lean[0] + Math.sin(phi) * Math.cos(theta) * spread * reach,
			crownMid + Math.cos(phi) * crownHalf * reach * 1.15,
			lean[2] + Math.sin(phi) * Math.sin(theta) * spread * reach
		];
		site[1] = Math.max(site[1], trunk + 0.6 * S);
		return { site, nodes: [] };
	});

	// attraction points: a little cloud round each site
	const CLOUD = 9;
	const attract: { p: Vec; item: number; alive: boolean }[] = [];
	items.forEach((place, i) => {
		for (let k = 0; k < CLOUD; k++) {
			// evenly through a ball
			const u = between(-1, 1);
			const t = between(0, Math.PI * 2);
			const q = Math.sqrt(1 - u * u);
			const rr = 0.75 * S * Math.cbrt(r());
			attract.push({ p: [place.site[0] + q * Math.cos(t) * rr, place.site[1] + u * rr, place.site[2] + q * Math.sin(t) * rr], item: i, alive: true });
		}
	});

	// ---- the trunk: straight up to where the crown begins, leaning a little ----------------------
	const STEP = 0.3 * S;
	const nodes: TreeNode[] = [];
	const add = (p: Vec, parent: number, item: number) => {
		nodes.push({ p, parent, children: [], radius: 0, item, branch: -1, serves: [] });
		if (parent >= 0) nodes[parent].children.push(nodes.length - 1);
		return nodes.length - 1;
	};
	let top = add([0, 0, 0], -1, -1);
	const rise = Math.ceil((trunk * 0.92) / STEP);
	for (let k = 1; k <= rise; k++) {
		const u = k / rise;
		top = add([lean[0] * u * u + between(-0.02, 0.02) * S, trunk * 0.92 * u, lean[2] * u * u + between(-0.02, 0.02) * S], top, -1);
	}
	// only the top of the trunk and what grows from it may branch: a clean bole below
	const firstGrowing = Math.max(1, nodes.length - Math.ceil(rise * 0.35));

	// ---- space colonisation ----------------------------------------------------------------------
	const KILL2 = (0.42 * S) ** 2;
	// wood only feels attraction points this close: limbs grow towards what's near them, and
	// reach further out only as they come near (a long reach makes limbs loop round to far points)
	const REACH2 = (2.4 * S) ** 2;
	const pull = new Map<number, { d: Vec; items: Map<number, number> }>();
	for (let round = 0; round < 400; round++) {
		pull.clear();
		let alive = 0;
		for (const a of attract) {
			if (!a.alive) continue;
			alive++;
			// the nearest wood that may grow
			let best = -1;
			let bestD = REACH2;
			for (let i = firstGrowing; i < nodes.length; i++) {
				const d = dist2(a.p, nodes[i].p);
				if (d < bestD) {
					bestD = d;
					best = i;
				}
			}
			if (best < 0) continue;
			const dir = sub(a.p, nodes[best].p);
			const l = len(dir) || 1;
			const entry = pull.get(best) ?? { d: [0, 0, 0] as Vec, items: new Map<number, number>() };
			entry.d[0] += dir[0] / l;
			entry.d[1] += dir[1] / l;
			entry.d[2] += dir[2] / l;
			entry.items.set(a.item, (entry.items.get(a.item) ?? 0) + 1);
			pull.set(best, entry);
		}
		if (!alive) break;
		if (!pull.size) {
			// nothing is near enough yet: the wood nearest what's left grows a step towards it
			const mid: Vec = [0, 0, 0];
			let count = 0;
			for (const a of attract)
				if (a.alive) {
					mid[0] += a.p[0];
					mid[1] += a.p[1];
					mid[2] += a.p[2];
					count++;
				}
			mid[0] /= count;
			mid[1] /= count;
			mid[2] /= count;
			let best = firstGrowing;
			let bestD = Infinity;
			for (const a of attract) {
				if (!a.alive) continue;
				for (let i = firstGrowing; i < nodes.length; i++) {
					const d = dist2(a.p, nodes[i].p);
					if (d < bestD) {
						bestD = d;
						best = i;
					}
				}
			}
			// towards the nearest point left, so it heads for that item rather than the middle of all of them
			let target: Vec = mid;
			let near = Infinity;
			for (const a of attract)
				if (a.alive && dist2(a.p, nodes[best].p) < near) {
					near = dist2(a.p, nodes[best].p);
					target = a.p;
				}
			const d = sub(target, nodes[best].p);
			const l = len(d) || 1;
			pull.set(best, { d: [d[0] / l, d[1] / l, d[2] / l], items: new Map([[-1, 1]]) });
		}
		let grew = 0;
		for (const [i, { d, items: by }] of pull) {
			// a little reach for the light, and a little wander
			const l0 = len(d) || 1;
			const dir: Vec = [d[0] / l0 + between(-0.15, 0.15), d[1] / l0 + 0.22 + between(-0.15, 0.15), d[2] / l0 + between(-0.15, 0.15)];
			const l = len(dir);
			if (l < 1e-3) continue;
			const p: Vec = [nodes[i].p[0] + (dir[0] / l) * STEP, nodes[i].p[1] + (dir[1] / l) * STEP, nodes[i].p[2] + (dir[2] / l) * STEP];
			// two attractions pulling one tip back and forth would grow it in place forever
			if (nodes[i].children.some((c) => dist2(nodes[c].p, p) < (STEP * 0.3) ** 2)) continue;
			let item = -1;
			let most = 0;
			for (const [it, n] of by)
				if (it >= 0 && n > most) {
					most = n;
					item = it;
				}
			add(p, i, item);
			grew++;
		}
		if (!grew) break;
		// attraction points the wood has reached are used up
		for (const a of attract) {
			if (!a.alive) continue;
			for (let i = nodes.length - grew; i < nodes.length; i++)
				if (dist2(a.p, nodes[i].p) < KILL2) {
					a.alive = false;
					break;
				}
		}
	}

	// ---- smooth the wood a little: every bend is a step's worth of jitter otherwise --------------
	for (let pass = 0; pass < 2; pass++) {
		const next = nodes.map((n) => n.p.slice() as Vec);
		nodes.forEach((n, i) => {
			if (n.parent < 0 || n.children.length !== 1 || i < firstGrowing) return;
			const a = nodes[n.parent].p;
			const b = nodes[n.children[0]].p;
			for (let k = 0; k < 3; k++) next[i][k] = n.p[k] * 0.5 + (a[k] + b[k]) * 0.25;
		});
		nodes.forEach((n, i) => (n.p = next[i]));
	}

	// ---- thickness: the pipe model (a bough is as thick as the twigs it feeds, together) ---------
	const TIP = 0.035 * S;
	const order = nodes.map((_, i) => i).reverse(); // children are always after their parents
	for (const i of order) {
		const n = nodes[i];
		n.radius = n.children.length ? Math.pow(n.children.reduce((s, c) => s + nodes[c].radius ** 2.4, 0), 1 / 2.4) : TIP;
	}
	// a stout trunk, whatever the data: scale the base to a share of the height, keep the tips fine
	const base = nodes[0].radius;
	const want = H * 0.035;
	if (base > 0) for (const n of nodes) n.radius = TIP + (n.radius - TIP) * ((want - TIP) / Math.max(1e-6, base - TIP));

	// ---- which branch each piece of wood serves ---------------------------------------------------
	const branches = nodes.map((n) => new Set<number>(n.item >= 0 ? [input.items[n.item].branch] : []));
	for (const i of order) {
		const p = nodes[i].parent;
		if (p >= 0) for (const b of branches[i]) branches[p].add(b);
	}
	nodes.forEach((n, i) => {
		n.serves = [...branches[i]].sort((a, b) => a - b);
		n.branch = n.serves.length === 1 ? n.serves[0] : -1;
	});

	// ---- each item's wood, nearest its site first --------------------------------------------------
	nodes.forEach((n, i) => {
		if (n.item >= 0) items[n.item].nodes.push(i);
	});
	items.forEach((place) => {
		if (!place.nodes.length) {
			// nothing grew for it (crowded out): its leaves hang from the nearest wood
			let best = 0;
			let bestD = Infinity;
			nodes.forEach((n, i) => {
				const d = dist2(n.p, place.site);
				if (d < bestD) {
					bestD = d;
					best = i;
				}
			});
			place.nodes.push(best);
		}
		place.nodes.sort((a, b) => dist2(nodes[a].p, place.site) - dist2(nodes[b].p, place.site));
		// only the wood out by the site carries its leaves, not the limb it grew along to get there
		const near = place.nodes.filter((i) => dist2(nodes[i].p, place.site) < (1.4 * S) ** 2);
		place.nodes = near.length ? near : place.nodes.slice(0, 1);
	});

	return { nodes, items, height: H, spread };
}
