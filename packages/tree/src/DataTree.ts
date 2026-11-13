// A tree as a chart: give it branches (groups) of items, and it grows a tree whose limbs carry the
// branches and whose leaves show the items. Each item's value sets how many leaves it holds (none:
// a bud), and its colour colours them. Values and colours can change at any time; the leaves ease
// to their new number and colour, so a tree can be played through time.
//
//   const tree = new DataTree({ seed: 'TL8782', branches: [{ id: 'Finches', items: ['Chaffinch', 'Linnet'] }] });
//   scene.add(tree.object);
//   tree.set({ Chaffinch: { value: 12, colour: '#dd9a55' } });
//   renderer.setAnimationLoop((t) => { tree.update(dt); renderer.render(scene, camera); });
//
// Plain Three.js, no framework: tree.object is an ordinary Group.
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	Group,
	InstancedMesh,
	Matrix4,
	Mesh,
	MeshStandardMaterial,
	Quaternion,
	Vector3,
	type ColorRepresentation,
	type Intersection,
	type Material,
	type Object3D
} from 'three';
import { grow, rng, seedOf, type Skeleton } from './grow.js';
import { leafShape, woodGeometry } from './wood.js';

export interface DataTreeBranch {
	id: string;
	items: string[];
}
export interface DataTreeData {
	/** a name or number: the same seed and data always grow the same tree */
	seed: string | number;
	/** in order round the crown; each takes a wedge as wide as its share of the items */
	branches: DataTreeBranch[];
}
export interface DataTreeOptions {
	/** the tree's height, in scene units; default 10 */
	height?: number;
	/** the most leaves one item can hold; default 48 */
	maxLeaves?: number;
	/** how many leaves a value is worth; default 5 + 4.5 × √value, none for 0 */
	leavesFor?: (value: number) => number;
	/** one leaf's length, in scene units; default 0.55 × height / 10 */
	leafSize?: number;
	bark?: ColorRepresentation;
	/** an item with no value: its bud */
	bud?: ColorRepresentation;
	/** what others fade towards while something is chosen (the background) */
	fade?: ColorRepresentation;
	/** move in the wind; default true (false when the system asks for less motion) */
	sway?: boolean;
}
export interface ItemValue {
	value: number;
	colour?: ColorRepresentation;
}
/** what a pointer is over: a branch's wood, an item's leaves or bud, or the trunk (both null) */
export interface TreeHit {
	branch: string | null;
	item: string | null;
}

const Z = new Vector3(0, 0, 1);

export class DataTree {
	/** add this to your scene */
	readonly object = new Group();
	readonly skeleton: Skeleton;
	readonly height: number;
	/** the crown's half-width */
	readonly spread: number;

	private readonly items: { id: string; branch: number }[];
	private readonly branchIds: string[];
	private readonly itemIndex = new Map<string, number>();
	private readonly maxLeaves: number;
	private readonly leavesFor: (v: number) => number;
	private readonly woodMesh: Mesh;
	private readonly woodColour: Float32Array;
	private readonly woodNode: Uint32Array;
	private readonly bark: Color;
	private readonly leaves: InstancedMesh;
	private readonly buds: InstancedMesh;
	/** each leaf slot: its item, its place and turn, its size now and wanted */
	private readonly slot: { item: number; k: number; at: Vector3; turn: Quaternion; size: number; scale: number }[] = [];
	private readonly budAt: Vector3[] = [];
	private readonly budSize: Float32Array;
	private readonly values: (ItemValue & { colour: Color })[];
	private readonly leafColour: Color[];
	private readonly budColour: Color;
	private readonly fadeColour: Color;
	private readonly uniforms = { uTime: { value: 0 }, uSway: { value: 1 }, uHeight: { value: 10 } };
	private chosen: { branch: number; item: number } = { branch: -1, item: -1 };
	private readonly m = new Matrix4();
	private readonly v = new Vector3();
	private readonly c = new Color();

	constructor(data: DataTreeData, options: DataTreeOptions = {}) {
		const seed = typeof data.seed === 'number' ? data.seed : seedOf(data.seed);
		this.height = options.height ?? 10;
		this.maxLeaves = options.maxLeaves ?? 48;
		this.leavesFor = options.leavesFor ?? ((v) => (v > 0 ? 5 + 4.5 * Math.sqrt(v) : 0));
		this.branchIds = data.branches.map((b) => b.id);
		this.items = data.branches.flatMap((b, bi) => b.items.map((id) => ({ id, branch: bi })));
		this.items.forEach((it, i) => this.itemIndex.set(it.id, i));
		this.skeleton = grow({ seed, branches: this.branchIds, items: this.items, height: this.height });
		this.spread = this.skeleton.spread;
		const S = this.height / 10;
		const still = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
		this.uniforms.uSway.value = (options.sway ?? !still) ? 1 : 0;
		this.uniforms.uHeight.value = this.height;

		// ---- the wood: one mesh, its colour per vertex so a branch's limbs can stand out --------
		const wood = woodGeometry(this.skeleton);
		const woodGeometryBuffer = new BufferGeometry();
		woodGeometryBuffer.setAttribute('position', new BufferAttribute(wood.position, 3));
		woodGeometryBuffer.setAttribute('normal', new BufferAttribute(wood.normal, 3));
		this.woodColour = new Float32Array(wood.position.length);
		woodGeometryBuffer.setAttribute('color', new BufferAttribute(this.woodColour, 3));
		woodGeometryBuffer.setIndex(new BufferAttribute(wood.index, 1));
		this.woodNode = wood.node;
		this.woodMesh = new Mesh(woodGeometryBuffer, this.sway(new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 })));
		this.woodMesh.userData.wood = true;
		this.object.add(this.woodMesh);

		// ---- the leaves: a slot for every leaf an item could hold, filled as its value rises ---
		const r = rng(seed ^ 0x5bd1e995);
		const shape = leafShape();
		const leafGeometry = new BufferGeometry();
		leafGeometry.setAttribute('position', new BufferAttribute(shape.position, 3));
		leafGeometry.setIndex(new BufferAttribute(shape.index, 1));
		leafGeometry.computeVertexNormals();
		const size = options.leafSize ?? 0.55 * S;
		const sk = this.skeleton;
		this.items.forEach((_, i) => {
			const place = sk.items[i];
			for (let k = 0; k < this.maxLeaves; k++) {
				// the first leaves at the twig tips, later ones further back along the item's wood
				const ni = place.nodes[Math.min(place.nodes.length - 1, Math.floor(k * (0.35 + 0.65 * r()) * (place.nodes.length / this.maxLeaves) * 2))];
				const node = sk.nodes[ni];
				const from = node.parent >= 0 ? sk.nodes[node.parent].p : node.p;
				const out = new Vector3(node.p[0] - from[0], node.p[1] - from[1], node.p[2] - from[2]).normalize();
				const at = new Vector3(...node.p).add(new Vector3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.35 * S));
				// pointing out from the twig, a little up, every leaf at its own angle
				const dir = out.multiplyScalar(0.6).add(new Vector3(r() - 0.5, r() * 0.6, r() - 0.5)).normalize();
				const turn = new Quaternion().setFromUnitVectors(Z, dir);
				turn.multiply(new Quaternion().setFromAxisAngle(Z, (r() - 0.5) * Math.PI * 1.4));
				this.slot.push({ item: i, k, at, turn, size: 0, scale: size * (0.75 + 0.5 * r()) });
			}
		});
		const leafMaterial = this.sway(new MeshStandardMaterial({ roughness: 0.8, side: DoubleSide }));
		this.leaves = new InstancedMesh(leafGeometry, leafMaterial, this.slot.length);
		this.leaves.frustumCulled = false; // they sway in the shader
		this.leaves.userData.leaves = true;
		this.object.add(this.leaves);

		// ---- a bud at the tip of each item's wood ------------------------------------------------
		const budGeometry = new BufferGeometry();
		{
			// a small pointed bud: a double cone
			const p: number[] = [];
			const idx: number[] = [];
			const n = 6;
			p.push(0, -0.5, 0, 0, 0.9, 0);
			for (let k = 0; k < n; k++) {
				const a = (k / n) * Math.PI * 2;
				p.push(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32);
			}
			for (let k = 0; k < n; k++) {
				const a = 2 + k;
				const b = 2 + ((k + 1) % n);
				idx.push(0, a, b, 1, b, a);
			}
			budGeometry.setAttribute('position', new BufferAttribute(Float32Array.from(p), 3));
			budGeometry.setIndex(idx);
			budGeometry.computeVertexNormals();
		}
		this.items.forEach((_, i) => {
			const tip = sk.nodes[sk.items[i].nodes[0]].p;
			this.budAt.push(new Vector3(...tip));
		});
		this.buds = new InstancedMesh(budGeometry, this.sway(new MeshStandardMaterial({ roughness: 0.7, flatShading: true })), this.items.length);
		this.buds.frustumCulled = false;
		this.buds.userData.buds = true;
		this.budSize = new Float32Array(this.items.length);
		this.object.add(this.buds);

		this.bark = new Color(options.bark ?? '#76604f');
		this.values = this.items.map(() => ({ value: 0, colour: new Color('#7fae63') }));
		this.leafColour = this.slot.map(() => new Color('#7fae63'));
		this.budColour = new Color(options.bud ?? '#8a7a68');
		this.fadeColour = new Color(options.fade ?? '#f4efe4');
		this.update(0);
	}

	/** Set items' values and colours (items not named keep theirs). */
	set(values: Record<string, ItemValue>) {
		for (const [id, v] of Object.entries(values)) {
			const i = this.itemIndex.get(id);
			if (i === undefined) continue;
			this.values[i].value = v.value;
			if (v.colour !== undefined) this.values[i].colour.set(v.colour);
		}
	}

	/** Bring out one branch, or one item (and its branch); everything else fades back. null: nothing. */
	choose(choice: { branch?: string | null; item?: string | null } | null) {
		const item = choice?.item ? (this.itemIndex.get(choice.item) ?? -1) : -1;
		const branch = item >= 0 ? this.items[item].branch : choice?.branch ? this.branchIds.indexOf(choice.branch) : -1;
		this.chosen = { branch, item };
	}

	/** Ease leaves and buds towards their values and colours, and move the wind on. True while leaves are still changing (the wind alone doesn't count). */
	update(dt: number): boolean {
		const k = dt <= 0 ? 1 : Math.min(1, dt * 6);
		this.uniforms.uTime.value += dt;
		let moving = false;
		const { branch, item } = this.chosen;
		const aside = (i: number) => branch >= 0 && this.items[i].branch !== branch;
		this.slot.forEach((s, j) => {
			const v = this.values[s.item];
			const want = s.k < Math.min(this.maxLeaves, Math.round(this.leavesFor(v.value))) ? s.scale * (aside(s.item) ? 0.6 : 1) : 0;
			if (Math.abs(want - s.size) > 0.002) moving = true;
			s.size += (want - s.size) * k;
			this.c.copy(v.colour);
			// each leaf a shade lighter or darker, so a cluster isn't one flat colour
			this.c.multiplyScalar(0.86 + ((s.k * 0.6180339) % 1) * 0.28);
			if (aside(s.item)) this.c.lerp(this.fadeColour, 0.7);
			this.leafColour[j].lerp(this.c, k);
			this.m.compose(s.at, s.turn, this.v.setScalar(Math.max(1e-5, s.size)));
			this.leaves.setMatrixAt(j, this.m);
			this.leaves.setColorAt(j, this.leafColour[j]);
		});
		const budScale = 0.16 * (this.height / 10);
		this.items.forEach((_, i) => {
			const want = this.values[i].value > 0 ? 0 : budScale * (aside(i) ? 0.7 : 1) * (item === i ? 1.6 : 1);
			if (Math.abs(want - this.budSize[i]) > 0.001) moving = true;
			this.budSize[i] += (want - this.budSize[i]) * k;
			this.m.compose(this.budAt[i], new Quaternion(), this.v.setScalar(Math.max(1e-5, this.budSize[i])));
			this.buds.setMatrixAt(i, this.m);
			this.c.copy(this.budColour);
			if (aside(i)) this.c.lerp(this.fadeColour, 0.6);
			this.buds.setColorAt(i, this.c);
		});
		this.leaves.instanceMatrix.needsUpdate = true;
		if (this.leaves.instanceColor) this.leaves.instanceColor.needsUpdate = true;
		this.buds.instanceMatrix.needsUpdate = true;
		if (this.buds.instanceColor) this.buds.instanceColor.needsUpdate = true;
		// wood serving other branches only pales (kept solid: see-through wood shows the whole crown as ghosts)
		const nodes = this.skeleton.nodes;
		const col = this.woodColour;
		for (let v = 0; v < this.woodNode.length; v++) {
			this.c.copy(this.bark);
			if (branch >= 0 && !nodes[this.woodNode[v]].serves.includes(branch)) this.c.lerp(this.fadeColour, 0.55);
			const o = v * 3;
			const dr = this.c.r - col[o];
			const dg = this.c.g - col[o + 1];
			const db = this.c.b - col[o + 2];
			if (Math.abs(dr) + Math.abs(dg) + Math.abs(db) > 0.004) moving = true;
			col[o] += dr * k;
			col[o + 1] += dg * k;
			col[o + 2] += db * k;
		}
		this.woodMesh.geometry.getAttribute('color').needsUpdate = true;
		return moving;
	}

	/** What a raycast hit on this tree is: a branch's wood, an item's leaf or bud, or the trunk. Null if it isn't this tree. */
	identify(hit: Pick<Intersection, 'object' | 'instanceId' | 'face'>): TreeHit | null {
		const o: Object3D = hit.object;
		if ((o === this.leaves || o === this.buds) && hit.instanceId !== undefined) {
			const i = o === this.leaves ? this.slot[hit.instanceId].item : hit.instanceId;
			return { branch: this.branchIds[this.items[i].branch], item: this.items[i].id };
		}
		if (o !== this.woodMesh) return null;
		const node = hit.face ? this.skeleton.nodes[this.woodNode[hit.face.a]] : null;
		// wood several branches share is the trunk's
		return { branch: node && node.branch >= 0 ? this.branchIds[node.branch] : null, item: null };
	}

	/** Where an item's leaves gather, or the middle of a branch's limb, in the tree's own space. */
	anchor(choice: { branch?: string | null; item?: string | null }): Vector3 | null {
		if (choice.item) {
			const i = this.itemIndex.get(choice.item);
			return i === undefined ? null : new Vector3(...this.skeleton.items[i].site);
		}
		if (choice.branch) {
			const b = this.branchIds.indexOf(choice.branch);
			const sites = this.skeleton.items.filter((_, i) => this.items[i].branch === b).map((p) => new Vector3(...p.site));
			if (!sites.length) return null;
			const mid = sites.reduce((a, s) => a.add(s), new Vector3()).multiplyScalar(1 / sites.length);
			// part way in from the leaves, towards the trunk: the limb itself
			return mid.lerp(new Vector3(0, mid.y * 0.85, 0), 0.35);
		}
		return new Vector3(0, this.height * 0.55, 0);
	}

	dispose() {
		this.woodMesh.geometry.dispose();
		(this.woodMesh.material as Material).dispose();
		this.leaves.geometry.dispose();
		(this.leaves.material as Material).dispose();
		this.leaves.dispose();
		this.buds.geometry.dispose();
		(this.buds.material as Material).dispose();
		this.buds.dispose();
	}

	/** wind: everything moves a little, more the higher up it is */
	private sway(material: MeshStandardMaterial) {
		material.onBeforeCompile = (shader) => {
			Object.assign(shader.uniforms, this.uniforms);
			shader.vertexShader = shader.vertexShader
				.replace(
					'#include <common>',
					/* glsl */ `#include <common>
					uniform float uTime;
					uniform float uSway;
					uniform float uHeight;`
				)
				.replace(
					'#include <project_vertex>',
					/* glsl */ `
					vec4 mvPosition = vec4( transformed, 1.0 );
					#ifdef USE_INSTANCING
						mvPosition = instanceMatrix * mvPosition;
					#endif
					float up = max(0.0, mvPosition.y / uHeight);
					float bend = up * up * uHeight * 0.012 * uSway;
					float phase = mvPosition.x * 0.7 + mvPosition.z * 0.5;
					mvPosition.x += sin(uTime * 1.1 + phase * 0.3) * bend;
					mvPosition.z += cos(uTime * 0.8 + phase * 0.4) * bend * 0.7;
					// leaves flutter on their own
					#ifdef USE_INSTANCING
						mvPosition.y += sin(uTime * 3.1 + phase * 3.0) * up * uHeight * 0.004 * uSway;
					#endif
					mvPosition = modelViewMatrix * mvPosition;
					gl_Position = projectionMatrix * mvPosition;`
				);
		};
		return material;
	}
}

