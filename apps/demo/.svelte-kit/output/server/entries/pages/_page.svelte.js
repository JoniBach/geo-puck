import { E as escape_html, Ht as run, T as clsx, _ as getContext, a as element, d as stringify, f as unsubscribe_stores, i as derived, l as spread_props, n as attr_style, o as ensure_array_like, r as bind_props, s as head, t as attr_class, u as store_get, w as attr, y as setContext } from "../../chunks/server.js";
import { c as on, i as onDestroy, o as createSubscriber } from "../../chunks/internal2.js";
import "../../chunks/client.js";
import { c as fromStore, d as readable, f as writable, l as toStore, u as derived$1 } from "../../chunks/exports.js";
import * as THREE from "three";
import { Box3, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DefaultLoadingManager, DoubleSide, Group, LinearFilter, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, NoToneMapping, Object3D, Quaternion, REVISION, Ray, Raycaster, RingGeometry, SRGBColorSpace, ShaderChunk, ShaderMaterial, Sphere, SphereGeometry, Spherical, Sprite, SpriteMaterial, Vector2, Vector3, Vector4, WebGLRenderer } from "three";
import { VectorTile, classifyRings } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";
import { interpolateRgb } from "d3-interpolate";
import "camera-controls";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { shaderIntersectFunction, shaderStructs } from "three-mesh-bvh";
import "@threejs-kit/instanced-sprite-mesh";
// ../../node_modules/@threlte/core/dist/utilities/currentWritable.js
/**
* ### `currentWritable`
*
* A writable store that also has a `current` property that is updated synchronously.
* For use in non-reactive contexts e.g. loops where unwrapping a store every frame is expensive.
*
* ```ts
* const store = currentWritable(0)
*
* useTask(() => {
* 	console.log(store.current) // 0
* })
*
* @param value
* @returns
*/
var currentWritable = (value) => {
	const store = writable(value);
	const extendedWritable = {
		set: (value) => {
			extendedWritable.current = value;
			store.set(value);
		},
		subscribe: store.subscribe,
		update: (fn) => {
			const newValue = fn(extendedWritable.current);
			extendedWritable.current = newValue;
			store.set(newValue);
		},
		current: value
	};
	return extendedWritable;
};
/**
* ### `runeToCurrentReadable`
*
* Bridges a Svelte 5 `$state` or `$derived` rune into the `CurrentReadable`
* interface, allowing rune-backed reactive values to be consumed as read-only
* stores by legacy or store-aware code.
*
* Pass the getter of a `$state` or `$derived` variable:
*
* ```ts
* let count = $state(0)
* const doubled = $derived(count * 2)
*
* const store = runeToCurrentReadable(() => doubled)
*
* store.subscribe((v) => console.log(v)) // reacts to rune changes
* console.log(store.current)             // synchronous read, no overhead
* ```
*
* Use this over `runeToCurrentWritable` when the value is derived or when
* external writes should not be allowed — for example, renderer settings
* that are owned by `<Canvas>` props.
*
* The `.current` property reads the rune directly and is always in sync.
* `.subscribe` is powered by `toStore`, which tracks the getter reactively
* via `$effect`.
*/
var runeToCurrentReadable = (get) => {
	const { subscribe } = toStore(get);
	return {
		subscribe,
		get current() {
			return run(get);
		}
	};
};
// ../../node_modules/@threlte/core/dist/context/fragments/dom.svelte.js
var useDOM = () => {
	const context = getContext("threlte-dom-context");
	if (!context) throw new Error("useDOM can only be used in a child component to <Canvas>.");
	return context;
};
// ../../node_modules/@threlte/core/dist/frame-scheduling/DAG.js
var DAG = class {
	allVertices = /* @__PURE__ */ new Map();
	/** Nodes that are fully unlinked */
	isolatedVertices = /* @__PURE__ */ new Map();
	connectedVertices = /* @__PURE__ */ new Map();
	sortedConnectedValues = [];
	needsSort = false;
	listeners = /* @__PURE__ */ new Map();
	emit(type, data) {
		const set = this.listeners.get(type);
		if (set) for (const handler of set) handler(data);
	}
	on(type, handler) {
		let set = this.listeners.get(type);
		if (!set) {
			set = /* @__PURE__ */ new Set();
			this.listeners.set(type, set);
		}
		set.add(handler);
	}
	off(type, handler) {
		this.listeners.get(type)?.delete(handler);
	}
	get sortedVertices() {
		return this.mapNodes((value) => value);
	}
	moveToIsolated(key) {
		const vertex = this.connectedVertices.get(key);
		if (!vertex) return;
		this.isolatedVertices.set(key, vertex);
		this.connectedVertices.delete(key);
	}
	moveToConnected(key) {
		const vertex = this.isolatedVertices.get(key);
		if (!vertex) return;
		this.connectedVertices.set(key, vertex);
		this.isolatedVertices.delete(key);
	}
	getKey = (v) => {
		if (typeof v === "object") return v.key;
		return v;
	};
	add(key, value, options) {
		let vertex = this.allVertices.get(key);
		if (vertex && vertex.value !== void 0) throw new Error(`A node with the key ${key.toString()} already exists`);
		if (!vertex) {
			vertex = {
				value,
				previous: /* @__PURE__ */ new Set(),
				next: /* @__PURE__ */ new Set()
			};
			this.allVertices.set(key, vertex);
		} else if (vertex.value === void 0) vertex.value = value;
		const hasEdges = vertex.next.size > 0 || vertex.previous.size > 0;
		if (!options?.after && !options?.before && !hasEdges) {
			this.isolatedVertices.set(key, vertex);
			this.emit("node:added", {
				key,
				type: "isolated",
				value
			});
			return;
		} else this.connectedVertices.set(key, vertex);
		if (options?.after) {
			const afterArr = Array.isArray(options.after) ? options.after : [options.after];
			for (const after of afterArr) vertex.previous.add(this.getKey(after));
			for (const after of afterArr) {
				const afterKey = this.getKey(after);
				const linkedAfter = this.allVertices.get(afterKey);
				if (!linkedAfter) {
					const newVertex = {
						value: void 0,
						previous: /* @__PURE__ */ new Set(),
						next: /* @__PURE__ */ new Set([key])
					};
					this.allVertices.set(afterKey, newVertex);
					this.connectedVertices.set(afterKey, newVertex);
				} else {
					linkedAfter.next.add(key);
					this.moveToConnected(afterKey);
				}
			}
		}
		if (options?.before) {
			const beforeArr = Array.isArray(options.before) ? options.before : [options.before];
			for (const before of beforeArr) vertex.next.add(this.getKey(before));
			for (const before of beforeArr) {
				const beforeKey = this.getKey(before);
				const linkedBefore = this.allVertices.get(beforeKey);
				if (!linkedBefore) {
					const newVertex = {
						value: void 0,
						previous: /* @__PURE__ */ new Set([key]),
						next: /* @__PURE__ */ new Set()
					};
					this.allVertices.set(beforeKey, newVertex);
					this.connectedVertices.set(beforeKey, newVertex);
				} else {
					linkedBefore.previous.add(key);
					this.moveToConnected(beforeKey);
				}
			}
		}
		this.emit("node:added", {
			key,
			type: "connected",
			value
		});
		this.needsSort = true;
	}
	remove(key) {
		const removeKey = this.getKey(key);
		if (this.isolatedVertices.get(removeKey)) {
			this.isolatedVertices.delete(removeKey);
			this.allVertices.delete(removeKey);
			this.emit("node:removed", {
				key: removeKey,
				type: "isolated"
			});
			return;
		}
		const linkedVertex = this.connectedVertices.get(removeKey);
		if (!linkedVertex || linkedVertex.value === void 0) return;
		for (const nextKey of linkedVertex.next) {
			const nextVertex = this.connectedVertices.get(nextKey);
			if (nextVertex) {
				nextVertex.previous.delete(removeKey);
				if (nextVertex.previous.size === 0 && nextVertex.next.size === 0) this.moveToIsolated(nextKey);
			}
		}
		for (const prevKey of linkedVertex.previous) {
			const prevVertex = this.connectedVertices.get(prevKey);
			if (prevVertex) {
				prevVertex.next.delete(removeKey);
				if (prevVertex.previous.size === 0 && prevVertex.next.size === 0) this.moveToIsolated(prevKey);
			}
		}
		this.connectedVertices.delete(removeKey);
		this.allVertices.delete(removeKey);
		this.emit("node:removed", {
			key: removeKey,
			type: "connected"
		});
		this.needsSort = true;
	}
	mapNodes(callback) {
		if (this.needsSort) this.sort();
		const result = [];
		this.forEachNode((value, index) => {
			result.push(callback(value, index));
		});
		return result;
	}
	forEachNode(callback) {
		if (this.needsSort) this.sort();
		let index = 0;
		for (; index < this.sortedConnectedValues.length; index++) callback(this.sortedConnectedValues[index], index);
		for (const vertex of this.isolatedVertices.values()) if (vertex.value !== void 0) callback(vertex.value, index++);
	}
	getValueByKey(key) {
		return this.allVertices.get(key)?.value;
	}
	sort() {
		const inDegree = /* @__PURE__ */ new Map();
		const zeroInDegreeQueue = [];
		const result = [];
		for (const [key, vertex] of this.connectedVertices) if (vertex.value !== void 0) inDegree.set(key, 0);
		for (const [vertexKey] of inDegree) {
			const vertex = this.connectedVertices.get(vertexKey);
			for (const next of vertex.next) if (inDegree.has(next)) inDegree.set(next, inDegree.get(next) + 1);
		}
		for (const [key, degree] of inDegree) if (degree === 0) zeroInDegreeQueue.push(key);
		let queueIndex = 0;
		while (queueIndex < zeroInDegreeQueue.length) {
			const vertexKey = zeroInDegreeQueue[queueIndex++];
			result.push(vertexKey);
			const nextSet = this.connectedVertices.get(vertexKey)?.next;
			if (nextSet) for (const adjVertex of nextSet) {
				const adjVertexInDegree = (inDegree.get(adjVertex) || 0) - 1;
				inDegree.set(adjVertex, adjVertexInDegree);
				if (adjVertexInDegree === 0) zeroInDegreeQueue.push(adjVertex);
			}
		}
		if (result.length !== inDegree.size) throw new Error("The graph contains a cycle, and thus can not be sorted topologically.");
		this.sortedConnectedValues.length = 0;
		for (let i = 0; i < result.length; i++) {
			const value = this.connectedVertices.get(result[i]).value;
			if (value !== void 0) this.sortedConnectedValues.push(value);
		}
		this.needsSort = false;
	}
	clear() {
		this.allVertices.clear();
		this.isolatedVertices.clear();
		this.connectedVertices.clear();
		this.sortedConnectedValues = [];
		this.needsSort = false;
	}
	static isKey(value) {
		return typeof value === "string" || typeof value === "symbol";
	}
	static isValue(value) {
		return typeof value === "object" && "key" in value;
	}
};
// ../../node_modules/@threlte/core/dist/context/fragments/scheduler.svelte.js
var useScheduler = () => {
	const context = getContext("threlte-scheduler-context");
	if (!context) throw new Error("useScheduler can only be used in a child component to <Canvas>.");
	return context;
};
globalThis.Date;
globalThis.Set;
var SvelteMap = globalThis.Map;
globalThis.URL;
globalThis.URLSearchParams;
// ../../node_modules/@threlte/core/dist/context/fragments/camera.svelte.js
var useCamera$1 = () => {
	const context = getContext("threlte-camera-context");
	if (!context) throw new Error("useCamera can only be used in a child component to <Canvas>.");
	return context;
};
// ../../node_modules/@threlte/core/dist/context/fragments/disposal.svelte.js
var useDisposal = () => {
	const context = getContext("threlte-disposal-context");
	if (!context) throw new Error("useDisposal can only be used in a child component to <Canvas>.");
	return context;
};
// ../../node_modules/@threlte/core/dist/context/fragments/parent.js
var parentContextKey = Symbol("threlte-parent-context");
/**
* The parent context is used to access the parent object created by a `<T>`
* component.
*/
var createParentContext = (parent) => {
	const context = { get current() {
		return parent();
	} };
	setContext(parentContextKey, context);
	return context;
};
/**
* The parent context is used to access the parent object created by a `<T>`
* component.
*
* @example
* ```svelte
* <T.Mesh>
*   <CustomComponent />
* </T.Mesh>
* ```
*
* The parent as retrieved inside the component `<CustomComponent>`
* will be the mesh created by the `<T.Mesh>` component.
*/
var useParent = () => {
	return getContext(parentContextKey);
};
var useParent_deprecated = () => {
	const parent = useParent();
	return runeToCurrentReadable(() => parent.current);
};
// ../../node_modules/@threlte/core/dist/context/fragments/parentObject3D.js
var parentObject3DContextKey = Symbol("threlte-parent-object3d-context");
/**
* The parentObject3D context is used to access the parent `THREE.Object3D`
* created by a `<T>` component. The context is automatically merged with the
* parentObject3D context of the parent component when the local context store
* is `undefined`.
*/
var createParentObject3DContext = (object) => {
	const parentObject3D = getContext(parentObject3DContextKey);
	const context = { get current() {
		return object() ?? parentObject3D.current;
	} };
	setContext(parentObject3DContextKey, context);
	return context;
};
/**
* The parentObject3D context is used to access the parent `THREE.Object3D`
* created by a `<T>` component.
*
* @example
* ```svelte
* <T.Mesh>
*   <T.MeshStandardMaterial>
*     <CustomComponent />
*   </T.MeshStandardMaterial>
* </T.Mesh>
* ```
*
* The parentObject3D as retrieved inside the component `<CustomComponent>`
* will be the mesh created by the `<T.Mesh>` component.
*/
var useParentObject3D = () => {
	return getContext(parentObject3DContextKey);
};
// ../../node_modules/@threlte/core/dist/context/fragments/scene.js
var useScene = () => {
	const context = getContext("threlte-scene-context");
	if (!context) throw new Error("useScene can only be used in a child component to <Canvas>.");
	return context;
};
// ../../node_modules/svelte/src/reactivity/reactive-value.js
/**
* @template T
*/
var ReactiveValue = class {
	#fn;
	#subscribe;
	/**
	*
	* @param {() => T} fn
	* @param {(update: () => void) => void} onsubscribe
	*/
	constructor(fn, onsubscribe) {
		this.#fn = fn;
		this.#subscribe = createSubscriber(onsubscribe);
	}
	get current() {
		this.#subscribe();
		return this.#fn();
	}
};
if (typeof HTMLElement === "function");
new ReactiveValue(() => void 0, (update) => on(window, "scroll", update));
new ReactiveValue(() => void 0, (update) => on(window, "scroll", update));
new ReactiveValue(() => void 0, (update) => on(window, "resize", update));
new ReactiveValue(() => void 0, (update) => on(window, "resize", update));
new ReactiveValue(() => void 0, (update) => on(window, "resize", update));
new ReactiveValue(() => void 0, (update) => on(window, "resize", update));
new ReactiveValue(() => void 0, (update) => {
	let value = window.screenLeft;
	let frame = requestAnimationFrame(function check() {
		frame = requestAnimationFrame(check);
		if (value !== (value = window.screenLeft)) update();
	});
	return () => {
		cancelAnimationFrame(frame);
	};
});
new ReactiveValue(() => void 0, (update) => {
	let value = window.screenTop;
	let frame = requestAnimationFrame(function check() {
		frame = requestAnimationFrame(check);
		if (value !== (value = window.screenTop)) update();
	});
	return () => {
		cancelAnimationFrame(frame);
	};
});
new ReactiveValue(() => void 0, (update) => {
	const unsub_online = on(window, "online", update);
	const unsub_offline = on(window, "offline", update);
	return () => {
		unsub_online();
		unsub_offline();
	};
});
// ../../node_modules/@threlte/core/dist/utilities/isInstanceOf.js
/**
* Check if an object is an instance of a given THREE class. Can be used as a
* type guard and as an alternative to `instanceof` which is prone to error and
* slower. It uses the `isFoo` property that THREE classes have to determine if
* an object is of a particular class.
*
* @example
* ```ts
* const obj = new THREE.Object3D()
* isInstanceOf(obj, 'Object3D') // true
* ```
*
* @param obj - The object to check.
* @param type - The class name to check against.
* @returns `true` if the object is an instance of the class, `false` otherwise.
*/
var isInstanceOf = (obj, type) => {
	return obj?.[`is${type}`] === true;
};
// ../../node_modules/@threlte/core/dist/components/T/utils/useCamera.svelte.js
var useCamera = (camera, manual, makeDefault, props) => {
	const { camera: defaultCamera, manual: defaultManual, makeDefaultCameras, makeDefaultCameraManual } = useCamera$1();
	const { invalidate } = useScheduler();
	const { size: sizeStore } = useDOM();
	fromStore(sizeStore);
};
// ../../node_modules/@threlte/core/dist/context/fragments/renderer.svelte.js
var useRenderer = () => {
	const context = getContext("threlte-renderer-context");
	if (!context) throw new Error("useRenderer can only be used in a child component to <Canvas>.");
	return context;
};
// ../../node_modules/@threlte/core/dist/context/fragments/user.js
/**
* ### `useUserContext`
*
* @returns The user context store. The context is to be used with
* `useThrelteUserContext` to set and get the user context.
*/
var useUserContext = () => {
	const context = getContext("threlte-user-context");
	if (!context) throw new Error("useUserContext can only be used in a child component to <Canvas>.");
	return context;
};
// ../../node_modules/@threlte/core/dist/Canvas.svelte
function Canvas($$renderer, $$props) {
	let { children, $$slots, $$events, ...rest } = $$props;
	$$renderer.push(`<div class="svelte-1tltp5i"><canvas class="svelte-1tltp5i">`);
	$$renderer.push("<!--[-1-->");
	$$renderer.push(`<!--]--></canvas></div>`);
}
// ../../node_modules/@threlte/core/dist/components/T/utils/useAttach.svelte.js
var useAttach = (ref, attach) => {
	const { invalidate } = useScheduler();
	useParent();
	useParentObject3D();
};
// ../../node_modules/@threlte/core/dist/components/T/utils/useDispose.svelte.js
var contextName = Symbol("threlte-disposable-object-context");
var useDispose = (object, dispose) => {
	const { disposableObjectMounted, disposableObjectUnmounted, removeObjectFromDisposal } = useDisposal();
	const parentDispose = getContext(contextName);
	const mergedDispose = derived(() => {
		const local = dispose();
		if (local !== void 0) return local !== false;
		if (parentDispose?.() === false) return false;
		return true;
	});
	setContext(contextName, () => mergedDispose());
};
// ../../node_modules/@threlte/core/dist/components/T/utils/useIs.js
var currentIs;
var setIs = (is) => {
	currentIs = is;
};
var useIs = () => {
	const is = currentIs;
	currentIs = void 0;
	return is;
};
// ../../node_modules/@threlte/core/dist/plugins/types.js
var pluginContextKey = "threlte-plugin-context";
// ../../node_modules/@threlte/core/dist/components/T/utils/usePlugins.js
var usePlugins = (args) => {
	const plugins = getContext(pluginContextKey);
	if (!plugins) return;
	const pluginsProps = [];
	const pluginsArray = Object.values(plugins);
	if (pluginsArray.length > 0) for (let i = 0; i < pluginsArray.length; i++) {
		const plugin = pluginsArray[i];
		const p = plugin(args);
		if (p && p.pluginProps) pluginsProps.push(...p.pluginProps);
	}
	return { pluginsProps };
};
// ../../node_modules/@threlte/core/dist/components/T/utils/useProps.svelte.js
var useProps = (object, props, pluginProps) => {
	const { invalidate } = useScheduler();
	/**
	* Prop keys are tracked separately from their values, so a key added after
	* mount (e.g. to a spread object) still gets its own effect below. The same
	* array is returned while the keys are unchanged, so value changes don't
	* re-run that effect. `Reflect.ownKeys` avoids reading values where it can.
	*/
	let previousKeys = [];
	derived(() => {
		const nextKeys = Reflect.ownKeys(props()).filter((key) => typeof key === "string");
		if (nextKeys.length !== previousKeys.length || nextKeys.some((key, index) => key !== previousKeys[index])) previousKeys = nextKeys;
		return previousKeys;
	});
};
// ../../node_modules/@threlte/core/dist/components/T/utils/utils.js
/**
* Short cicruits if the input is not a function, then calls toString on Function with guaranteed safe behavior
*/
var isClass = (input) => {
	return typeof input === "function" && Function.prototype.toString.call(input).startsWith("class ");
};
var determineRef = (is, args) => {
	if (isClass(is)) {
		if (Array.isArray(args)) return new is(...args);
		else return new is();
	}
	return is;
};
// ../../node_modules/@threlte/core/dist/components/T/Camera.svelte
function Camera($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { ref, manual = false, makeDefault = false, $$slots, $$events, ...rest } = $$props;
		useCamera(() => ref, () => manual, () => makeDefault, () => rest);
	});
}
// ../../node_modules/@threlte/core/dist/components/T/T.svelte
function T$2($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { is = useIs(), args, attach, dispose, ref = void 0, oncreate, children, makeDefault, manual, $$slots, $$events, ...props } = $$props;
		/**
		* When "is" or "args" change, we need to create a new ref.
		*/
		const internalRef = derived(() => determineRef(is, args));
		const plugins = usePlugins({
			get ref() {
				return internalRef();
			},
			get args() {
				return args;
			},
			get attach() {
				return attach;
			},
			get manual() {
				return manual;
			},
			get makeDefault() {
				return makeDefault;
			},
			get dispose() {
				return dispose;
			},
			get props() {
				return props;
			}
		});
		useProps(() => internalRef(), () => props, () => plugins?.pluginsProps);
		useAttach(() => internalRef(), () => attach);
		useDispose(() => internalRef(), () => dispose);
		createParentObject3DContext(() => isInstanceOf(internalRef(), "Object3D") ? internalRef() : void 0);
		createParentContext(() => internalRef());
		if (isInstanceOf(internalRef(), "PerspectiveCamera") || isInstanceOf(internalRef(), "OrthographicCamera")) {
			$$renderer.push("<!--[0-->");
			Camera($$renderer, spread_props([{
				ref: internalRef(),
				manual,
				makeDefault
			}, props]));
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		children?.($$renderer, { ref: internalRef() });
		$$renderer.push(`<!---->`);
		bind_props($$props, { ref });
	});
}
// ../../node_modules/@threlte/core/dist/components/T/T.js
var catalogue = {};
/**
* ## `<T>`
*
* Threlte's `<T>` component is a wrapper around Three.js objects. It is a generic component that can be used to create any Three.js object.
*
* @example
*
* ```svelte
* <script>
* 	import { T } from 'threlte'
* <\/script>
*
* <T.PerspectiveCamera makeDefault />
*
* <T.Mesh>
* 	<T.BoxGeometry />
* 	<T.MeshBasicMaterial color="red" />
* </T.Mesh>
* ```
*/
var T$1 = new Proxy(T$2, { get(_target, is) {
	if (typeof is !== "string") return Reflect.get(_target, is);
	const module = catalogue[is] || THREE[is];
	if (module === void 0) throw new Error(`No Three.js module found for ${is}. Did you forget to extend the catalogue?`);
	return (...args) => {
		setIs(module);
		return T$2(...args);
	};
} });
// ../../node_modules/@threlte/core/dist/context/compounds/useThrelte.js
/**
* ### `useThrelte`
*
* This hook provides access to the main context of a Threlte application.
*
* ```svelte
* <script>
*   import { useThrelte } from 'threlte'
*   const { camera } = useThrelte()
*
*   // Access the camera
*   console.log(camera.current) // => PerspectiveCamera { … }
* <\/script>
* ```
*/
var useThrelte = () => {
	const schedulerCtx = useScheduler();
	const rendererCtx = useRenderer();
	const cameraCtx = useCamera$1();
	const sceneCtx = useScene();
	const domCtx = useDOM();
	return {
		advance: schedulerCtx.advance,
		autoRender: schedulerCtx.autoRender,
		autoRenderTask: rendererCtx.autoRenderTask,
		camera: cameraCtx.camera,
		colorManagementEnabled: rendererCtx.colorManagementEnabled,
		colorSpace: rendererCtx.colorSpace,
		dpr: rendererCtx.dpr,
		invalidate: schedulerCtx.invalidate,
		mainStage: schedulerCtx.mainStage,
		renderer: rendererCtx.renderer,
		renderMode: schedulerCtx.renderMode,
		renderStage: schedulerCtx.renderStage,
		scheduler: schedulerCtx.scheduler,
		shadows: rendererCtx.shadows,
		shouldRender: schedulerCtx.shouldRender,
		dom: domCtx.dom,
		canvas: domCtx.canvas,
		size: domCtx.size,
		toneMapping: rendererCtx.toneMapping,
		get scene() {
			return sceneCtx.scene;
		},
		set scene(scene) {
			sceneCtx.scene = scene;
		}
	};
};
// ../../node_modules/@threlte/core/dist/utilities/browser.js
var browser = typeof window !== "undefined";
// ../../node_modules/@threlte/core/dist/hooks/useTask.svelte.js
function useTask(keyOrFn, fnOrOptions, options) {
	if (!browser) return {
		task: void 0,
		start: () => void 0,
		stop: () => void 0,
		started: readable(false)
	};
	let key;
	let fn;
	let opts;
	if (DAG.isKey(keyOrFn)) {
		key = keyOrFn;
		fn = fnOrOptions;
		opts = options;
	} else {
		key = Symbol("useTask");
		fn = keyOrFn;
		opts = fnOrOptions;
	}
	const schedulerCtx = useScheduler();
	opts?.autoInvalidate;
	let stage = schedulerCtx.mainStage;
	let running = derived(() => opts?.running?.() ?? opts?.autoStart ?? true);
	if (opts) {
		if (opts.stage) {
			if (DAG.isValue(opts.stage)) stage = opts.stage;
			else {
				const maybeStage = schedulerCtx.scheduler.getStage(opts.stage);
				if (!maybeStage) throw new Error(`No stage found with key ${opts.stage.toString()}`);
				stage = maybeStage;
			}
		} else if (opts.after) {
			if (Array.isArray(opts.after)) for (let index = 0; index < opts.after.length; index++) {
				const element = opts.after[index];
				if (DAG.isValue(element)) {
					stage = element.stage;
					break;
				}
			}
			else if (DAG.isValue(opts.after)) stage = opts.after.stage;
		} else if (opts.before) {
			if (Array.isArray(opts.before)) for (let index = 0; index < opts.before.length; index++) {
				const element = opts.before[index];
				if (DAG.isValue(element)) {
					stage = element.stage;
					break;
				}
			}
			else if (DAG.isValue(opts.before)) stage = opts.before.stage;
		}
	}
	return {
		task: stage.createTask(key, fn, opts),
		start: () => {
			running(true);
		},
		stop: () => {
			running(false);
		},
		started: toStore(() => running())
	};
}
// ../../node_modules/@threlte/core/dist/hooks/useThrelteUserContext.js
function useThrelteUserContext(namespace, value, options) {
	const userCtxStore = useUserContext();
	if (!userCtxStore) throw new Error("No user context store found, did you invoke this function outside of your main <Canvas> component?");
	if (!namespace) return { subscribe: userCtxStore.subscribe };
	if (namespace && !value) return derived$1(userCtxStore, (ctx) => ctx[namespace]);
	userCtxStore.update((ctx) => {
		if (namespace in ctx) {
			if (!options || options.existing === "skip") return ctx;
			if (options.existing === "merge") {
				const v = typeof value === "function" ? value() : value;
				Object.assign(ctx[namespace], v);
				return ctx;
			}
		}
		ctx[namespace] = typeof value === "function" ? value() : value;
		return ctx;
	});
	return userCtxStore.current[namespace];
}
// ../../node_modules/@threlte/core/dist/utilities/observe.svelte.js
var signal = Symbol();
var isStore = (dep) => {
	return typeof dep?.subscribe === "function";
};
var runObserve = (dependencies, callback, pre) => {
	const stores = dependencies().map((d) => {
		if (isStore(d)) return fromStore(d);
		return signal;
	});
	derived(() => dependencies().map((d, i) => {
		if (stores[i] === signal) return d;
		return stores[i].current;
	}));
	if (pre) {}
};
var observePost = (dependencies, callback) => {
	return runObserve(dependencies, callback, false);
};
/**
* ### `observe.pre`
*
* Observe multiple stores and reactive values and call a callback when they
* change to trigger side effects. The callback can return a cleanup function
* that will be called when the dependencies change again or when the effect
* root (most likely a component) is destroyed. Under the hood, `observe.pre` uses
* Svelte's `$effect` to track dependencies and trigger the callback. For a
* version that uses `$effect`, use `observe`.
*
* ```ts
* const count = writable(0)
* let name = $state('John')
*
* observe.pre(() => [count, name], ([count, name]) => {
*  console.log(count, name) // 0 John
* })
* ```
*
* The callback can return a cleanup function that will be called when the
* dependencies change again or when the component is destroyed.
*
* ```ts
* const count = writable(0)
*
* observe.pre(() => [count], ([count]) => {
*  console.log(count) // 0
*  return () => {
*    console.log('cleanup')
*  }
* })
* ```
*
* @param dependencies - A function that returns an array of dependencies.
* @param callback - A function that will be called with the current values of
* the dependencies. The callback can return a cleanup function that will be
* called when the dependencies change again or when the component is destroyed.
*/
var observePre = (dependencies, callback) => {
	return runObserve(dependencies, callback, true);
};
Object.assign(observePost, { pre: observePre });
REVISION.replace("dev", "");
// ../../packages/data/src/geo.ts
var RAD$1 = Math.PI / 180;
/** metres per degree of latitude (and of longitude at the equator) */
var M_PER_DEG = 111320;
/** A flat world in metres centred on a place: x east, n north. */
function localPlane(centre) {
	const kx = M_PER_DEG * Math.cos(centre.lat * RAD$1);
	return {
		toLocal: (lon, lat) => [(lon - centre.lon) * kx, (lat - centre.lat) * M_PER_DEG],
		toLonLat: (x, n) => [centre.lon + x / kx, centre.lat + n / M_PER_DEG]
	};
}
/** fractional tile x at zoom z */
var mercX = (lon, z) => (lon + 180) / 360 * 2 ** z;
/** fractional tile y at zoom z (0 at the top, ~85° N) */
var mercY = (lat, z) => {
	const s = Math.sin(lat * RAD$1);
	return (.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * 2 ** z;
};
/** fractional tile coords -> lon/lat */
var tileToLonLat = (tx, ty, z) => {
	const lon = tx / 2 ** z * 360 - 180;
	const m = Math.PI * (1 - 2 * ty / 2 ** z);
	return [lon, Math.atan(Math.sinh(m)) / RAD$1];
};
/** Width of one tile at zoom z, in metres, at this latitude. */
var tileMetres = (z, lat) => 2 * Math.PI * 6378137 * Math.cos(lat * RAD$1) / 2 ** z;
/** Every tile at zoom z within `reach` metres of the centre (a square around it). */
function tilesAround(centre, reach, z) {
	const plane = localPlane(centre);
	const [w, nTop] = plane.toLonLat(-reach, reach);
	const [e, s] = plane.toLonLat(reach, -reach);
	const out = [];
	for (let x = Math.floor(mercX(w, z)); x <= Math.floor(mercX(e, z)); x++) for (let y = Math.floor(mercY(nTop, z)); y <= Math.floor(mercY(s, z)); y++) out.push([x, y]);
	return out;
}
/** The deepest zoom (up to `max`) at which `reach` metres either side fits in about `across` tiles. */
function zoomFor(reach, lat, across, max, min = 3) {
	for (let z = max; z > min; z--) if (tileMetres(z, lat) * (across - 1) >= reach * 2) return z;
	return min;
}
/** "53.0685° N, 4.0763° W" */
var formatLonLat = ({ lon, lat }, digits = 4) => `${Math.abs(lat).toFixed(digits)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(digits)}° ${lon >= 0 ? "E" : "W"}`;
// ../../packages/data/src/elevation.ts
var URL_OF = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
var tiles = /* @__PURE__ */ new Map();
/** decoded tiles kept (256 KB each) */
var MAX_TILES = 96;
function trim() {
	for (const [key, t] of tiles) {
		if (tiles.size <= MAX_TILES) break;
		if (!(t instanceof Promise)) tiles.delete(key);
	}
}
/** The exact pixel values of an 8-bit RGB/RGBA, non-interlaced PNG (as Terrarium tiles are). */
async function pngPixels(buf) {
	const bytes = new Uint8Array(buf);
	const view = new DataView(buf);
	let width = 0;
	let height = 0;
	let channels = 0;
	const idat = [];
	for (let p = 8; p < bytes.length;) {
		const len = view.getUint32(p);
		const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
		if (type === "IHDR") {
			width = view.getUint32(p + 8);
			height = view.getUint32(p + 12);
			const depth = bytes[p + 16];
			const colour = bytes[p + 17];
			const interlace = bytes[p + 20];
			channels = colour === 2 ? 3 : colour === 6 ? 4 : 0;
			if (depth !== 8 || !channels || interlace) throw new Error("unsupported PNG");
		} else if (type === "IDAT") idat.push(bytes.subarray(p + 8, p + 8 + len));
		else if (type === "IEND") break;
		p += 12 + len;
	}
	const raw = new Uint8Array(await new Response(new Blob(idat).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer());
	const stride = width * channels;
	const out = new Uint8Array(height * stride);
	for (let y = 0; y < height; y++) {
		const filter = raw[y * (stride + 1)];
		const src = y * (stride + 1) + 1;
		const row = y * stride;
		for (let x = 0; x < stride; x++) {
			const a = x >= channels ? out[row + x - channels] : 0;
			const b = y ? out[row - stride + x] : 0;
			const c = x >= channels && y ? out[row - stride + x - channels] : 0;
			let v = raw[src + x];
			if (filter === 1) v += a;
			else if (filter === 2) v += b;
			else if (filter === 3) v += a + b >> 1;
			else if (filter === 4) {
				const p = a + b - c;
				const pa = Math.abs(p - a);
				const pb = Math.abs(p - b);
				const pc = Math.abs(p - c);
				v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
			}
			out[row + x] = v & 255;
		}
	}
	return {
		width,
		height,
		channels,
		data: out
	};
}
/** A pixel far above or below all eight neighbours is a bad sample in the source: smooth it. */
function despike(h, cols, rows, limit) {
	const src = h.slice();
	const n = /* @__PURE__ */ new Float32Array(8);
	for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
		const i = r * cols + c;
		let k = 0;
		for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (dr || dc) n[k++] = src[i + dr * cols + dc];
		let hi = -Infinity;
		let lo = Infinity;
		for (const v of n) {
			if (v > hi) hi = v;
			if (v < lo) lo = v;
		}
		if (src[i] - hi > limit || lo - src[i] > limit) {
			n.sort();
			h[i] = (n[3] + n[4]) / 2;
		}
	}
}
async function decode(z, tx, ty) {
	try {
		const r = await fetch(URL_OF(z, tx, ty));
		if (!r.ok) return null;
		const { width, height, channels, data } = await pngPixels(await r.arrayBuffer());
		if (width !== 256 || height !== 256) return null;
		const h = /* @__PURE__ */ new Float32Array(65536);
		for (let i = 0; i < h.length; i++) {
			const o = i * channels;
			h[i] = data[o] * 256 + data[o + 1] + data[o + 2] / 256 - 32768;
		}
		despike(h, 256, 256, 50);
		return h;
	} catch {
		return null;
	}
}
function load(z, x, y) {
	const key = `${z}/${x}/${y}`;
	let t = tiles.get(key);
	if (t === void 0) {
		t = decode(z, x, y).then((h) => {
			tiles.delete(key);
			tiles.set(key, h);
			trim();
			return h;
		});
		tiles.set(key, t);
	}
	return t;
}
/**
* Heights within `reach` metres of a place, at tile zoom z (12 is ~20-38 m a pixel, 10 is ~4× coarser).
* Resolves once every tile has landed. Local metres → tile pixel is linearised around the centre
* (accurate to a fraction of a pixel over tens of km), so sampling is a multiply-add and a
* bilinear lookup.
*/
async function heights(centre, reach, z) {
	await Promise.all(tilesAround(centre, reach, z).map(([x, y]) => load(z, x, y)));
	const plane = localPlane(centre);
	const px = (x, n) => {
		const [lon, lat] = plane.toLonLat(x, n);
		return [mercX(lon, z) * 256, mercY(lat, z) * 256];
	};
	const [p0x, p0y] = px(0, 0);
	const [pex, pey] = px(1e3, 0);
	const [pnx, pny] = px(0, 1e3);
	const [ax, ay, bx, by] = [
		(pex - p0x) / 1e3,
		(pey - p0y) / 1e3,
		(pnx - p0x) / 1e3,
		(pny - p0y) / 1e3
	];
	const at = (xx, yy) => {
		const t = tiles.get(`${z}/${Math.floor(xx / 256)}/${Math.floor(yy / 256)}`);
		return t instanceof Float32Array ? t[(yy & 255) * 256 + (xx & 255)] : NaN;
	};
	return (x, n) => {
		const fx = p0x + ax * x + bx * n - .5;
		const fy = p0y + ay * x + by * n - .5;
		const ix = Math.floor(fx);
		const iy = Math.floor(fy);
		const u = fx - ix;
		const v = fy - iy;
		return (at(ix, iy) * (1 - u) + at(ix + 1, iy) * u) * (1 - v) + (at(ix, iy + 1) * (1 - u) + at(ix + 1, iy + 1) * u) * v;
	};
}
// ../../packages/data/src/osm.ts
var TILEJSON = "https://tiles.openfreemap.org/planet";
var OSM_ATTRIBUTION = "© OpenMapTiles © OpenStreetMap contributors";
var TIER = {
	motorway: 0,
	trunk: 0,
	primary: 0,
	secondary: 1,
	tertiary: 1,
	minor: 2,
	service: 3,
	track: 4
};
var PLACE_KIND = {
	city: "town",
	town: "town",
	village: "village",
	hamlet: "hamlet",
	suburb: "hamlet",
	isolated_dwelling: "locality",
	locality: "locality",
	neighbourhood: "locality"
};
var PARK_CLASSES = /* @__PURE__ */ new Set([
	"national_park",
	"conservation",
	"protected_area",
	"nature_reserve"
]);
var NATIONAL = /national\s*park|parc\s+cenedlaethol|nationalpark|parc\s+national|parque\s+nacional|parco\s+nazionale|park\s+narodowy|národní\s+park|nationaal\s+park|kansallispuisto|nasjonalpark/i;
var template = null;
/** The current planet tile URL (versioned), from OpenFreeMap's TileJSON. */
var tileUrl = () => template ??= fetch(TILEJSON).then((r) => r.json()).then((tj) => tj.tiles[0]);
var cache = /* @__PURE__ */ new Map();
function tile(z, x, y) {
	const key = `${z}/${x}/${y}`;
	let t = cache.get(key);
	if (!t) {
		t = tileUrl().then((u) => fetch(u.replace("{z}", `${z}`).replace("{x}", `${x}`).replace("{y}", `${y}`))).then(async (r) => r.ok && r.status !== 204 ? new VectorTile(new PbfReader(new Uint8Array(await r.arrayBuffer()))) : null).catch(() => null);
		cache.set(key, t);
		if (cache.size > 300) cache.delete(cache.keys().next().value);
	}
	return t;
}
/** Read the tiles within `reach` at zoom z; `visit` gets each feature with a tile-point → local converter. */
async function readTiles(centre, reach, z, layers, visit) {
	const plane = localPlane(centre);
	const list = tilesAround(centre, reach, z);
	(await Promise.all(list.map(([x, y]) => tile(z, x, y)))).forEach((vt, k) => {
		if (!vt) return;
		const [tx, ty] = list[k];
		for (const name of layers) {
			const layer = vt.layers[name];
			if (!layer) continue;
			const E = layer.extent;
			const toLocal = (p) => plane.toLocal(...tileToLonLat(tx + p.x / E, ty + p.y / E, z));
			for (let i = 0; i < layer.length; i++) {
				const f = layer.feature(i);
				visit(name, f.properties, f.type, f.loadGeometry(), toLocal, E);
			}
		}
	});
	return plane;
}
var flat = (pts) => Float32Array.from(pts.flat());
/**
* A shape's outline without the straight cuts along tile edges (tiles clip polygons, a little
* outside their own square): a dashed park edge shouldn't trace the tile grid.
*/
function realEdges(ring, E, toLocal) {
	const runs = [];
	let run = [];
	const cut = (a, b) => a.x === b.x && (a.x <= 0 || a.x >= E) || a.y === b.y && (a.y <= 0 || a.y >= E);
	for (let k = 1; k < ring.length; k++) {
		if (cut(ring[k - 1], ring[k])) {
			if (run.length > 1) runs.push(flat(run));
			run = [];
			continue;
		}
		if (!run.length) run.push(toLocal(ring[k - 1]));
		run.push(toLocal(ring[k]));
	}
	if (run.length > 1) runs.push(flat(run));
	return runs;
}
/** Water drawn into a canvas over the land, then sampled: a mask the land's shader can use. */
function waterMask(polys, reach) {
	if (typeof OffscreenCanvas === "undefined") {
		const inRing = (ring, x, n) => {
			let inside = false;
			for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
				const [xi, yi] = ring[i];
				const [xj, yj] = ring[j];
				if (yi > n !== yj > n && x < (xj - xi) * (n - yi) / (yj - yi) + xi) inside = !inside;
			}
			return inside;
		};
		return (x, n) => polys.some((poly) => poly.filter((ring) => inRing(ring, x, n)).length % 2 === 1) ? 1 : 0;
	}
	const S = 1024;
	const ctx = new OffscreenCanvas(S, S).getContext("2d");
	const k = S / (2 * reach);
	ctx.fillStyle = "#fff";
	for (const poly of polys) {
		ctx.beginPath();
		for (const ring of poly) ring.forEach(([x, n], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, (x + reach) * k, (reach - n) * k));
		ctx.fill("evenodd");
	}
	const px = ctx.getImageData(0, 0, S, S).data;
	return (x, n) => {
		const c = Math.floor((x + reach) * k);
		const r = Math.floor((reach - n) * k);
		return c < 0 || r < 0 || c >= S || r >= S ? 0 : px[(r * S + c) * 4 + 3] / 255;
	};
}
/**
* The map around a place: everything within `near` metres (the land on the globe), and the main
* roads, rivers and park edges out to `far` (the surroundings beyond its rim).
*/
async function mapAround(centre, near, far) {
	const roads = [];
	const rivers = [];
	const parks = /* @__PURE__ */ new Map();
	const places = /* @__PURE__ */ new Map();
	const water = [];
	const zNear = near <= 2600 ? 14 : zoomFor(near, centre.lat, 6, 13);
	const zFar = far <= 9e3 ? 12 : far <= 2e4 ? 11 : far <= 45e3 ? 10 : zoomFor(far, centre.lat, 5, 9);
	const landTiers = near > 45e3 ? 0 : near > 14e3 ? 1 : near > 8e3 ? 2 : 4;
	const inReach = (reach) => (pts) => pts.some(([x, n]) => Math.abs(x) < reach && Math.abs(n) < reach);
	const band = (reach, z, detail) => readTiles(centre, reach, z, detail ? [
		"transportation",
		"waterway",
		"water",
		"park",
		"place",
		"mountain_peak",
		"water_name"
	] : [
		"transportation",
		"waterway",
		"park"
	], (layer, p, type, rings, toLocal, E) => {
		const within = inReach(reach);
		if (layer === "transportation" && type === 2) {
			const tier = TIER[p.class];
			if (tier === void 0 || p.brunnel === "tunnel" || tier > (detail ? landTiers : Math.min(1, landTiers))) return;
			for (const line of rings) {
				const pts = line.map(toLocal);
				if (within(pts) && (detail || !pts.every(([x, n]) => Math.hypot(x, n) < near))) roads.push({
					tier,
					xy: flat(pts)
				});
			}
		} else if (layer === "waterway" && type === 2) {
			if (p.class !== "river" && p.class !== "canal") return;
			for (const line of rings) {
				const pts = line.map(toLocal);
				if (within(pts) && (detail || !pts.every(([x, n]) => Math.hypot(x, n) < near))) rivers.push(flat(pts));
			}
		} else if (layer === "water" && type === 3) {
			if (p.class === "swimming_pool") return;
			for (const poly of classifyRings(rings)) water.push(poly.map((ring) => ring.map(toLocal)));
		} else if (layer === "park" && type === 3) {
			const name = p["name:en"] ?? p["name:latin"] ?? p.name;
			if (!PARK_CLASSES.has(p.class) || !name) return;
			const names = `${name} ${p.name ?? ""}`;
			const national = NATIONAL.test(names) || p.class === "national_park" && !/reserve|natur|gwarchodfa/i.test(names);
			const park = parks.get(name) ?? {
				name,
				national,
				edges: [],
				polygons: []
			};
			parks.set(name, park);
			for (const poly of classifyRings(rings)) {
				park.polygons.push(poly.map((ring) => flat(ring.map(toLocal))));
				for (const ring of poly) park.edges.push(...realEdges(ring, E, toLocal));
			}
		} else if (type === 1 && (layer === "place" || layer === "mountain_peak" || layer === "water_name")) {
			const kind = layer === "place" ? PLACE_KIND[p.class] : layer === "mountain_peak" ? "peak" : "water";
			const name = p["name:latin"] ?? p.name;
			if (!kind || !name) return;
			if (layer === "mountain_peak" && p.class !== "peak" && p.class !== "volcano") return;
			const [x, n] = toLocal(rings[0][0]);
			const key = `${kind}:${name}:${Math.round(x / 200)}:${Math.round(n / 200)}`;
			if (!places.has(key)) places.set(key, {
				kind,
				name,
				x,
				n,
				ele: typeof p.ele === "number" ? p.ele : void 0
			});
		}
	});
	await Promise.all([band(near, zNear, true), band(far, zFar, false)]);
	return {
		roads,
		rivers,
		parks: [...parks.values()],
		places: [...places.values()],
		waterAt: waterMask(water, near)
	};
}
/** Which national park (if any) a local point is in: one named a national park first. */
function parkAt(parks, x, n) {
	const inRing = (ring) => {
		let inside = false;
		for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
			const [xi, yi, xj, yj] = [
				ring[i],
				ring[i + 1],
				ring[j],
				ring[j + 1]
			];
			if (yi > n !== yj > n && x < (xj - xi) * (n - yi) / (yj - yi) + xi) inside = !inside;
		}
		return inside;
	};
	const inside = (park) => park.polygons.some(([outer, ...holes]) => inRing(outer) && !holes.some(inRing));
	const candidates = parks.filter((p) => p.national && inside(p));
	return (candidates.find((p) => NATIONAL.test(p.name)) ?? candidates[0])?.name ?? null;
}
// ../../packages/data/src/weather.ts
var WEATHER_ATTRIBUTION = "Weather data by Open-Meteo.com (CC BY 4.0)";
async function weatherFor({ lon, lat }) {
	const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code,is_day&forecast_days=1&timezone=auto&wind_speed_unit=mph&timeformat=unixtime`;
	try {
		const r = await fetch(url);
		if (!r.ok) return null;
		const j = await r.json();
		const h = j.hourly;
		const samples = h.time.map((t, i) => ({
			t,
			temp: h.temperature_2m[i],
			precip: h.precipitation[i] ?? 0,
			cloud: h.cloud_cover[i] ?? 0,
			wind: h.wind_speed_10m[i] ?? 0,
			windDir: h.wind_direction_10m[i] ?? 0,
			code: h.weather_code[i] ?? 0,
			isDay: h.is_day[i] ?? 1
		}));
		return {
			utcOffset: j.utc_offset_seconds ?? 0,
			timeZone: j.timezone ?? "UTC",
			dayStart: samples[0]?.t ?? 0,
			samples
		};
	} catch {
		return null;
	}
}
/** The weather at a moment: the hour it falls in, with temperature and wind eased into the next. */
function weatherAt(w, t) {
	if (!w?.samples.length) return null;
	const s = w.samples;
	let k = 0;
	while (k < s.length - 1 && s[k + 1].t <= t) k++;
	const a = s[k];
	const b = s[Math.min(k + 1, s.length - 1)];
	const f = b.t > a.t ? Math.max(0, Math.min(1, (t - a.t) / (b.t - a.t))) : 0;
	return {
		...a,
		temp: a.temp + (b.temp - a.temp) * f,
		wind: a.wind + (b.wind - a.wind) * f
	};
}
/** WMO weather code -> icon + words (https://open-meteo.com/en/docs, "WMO Weather interpretation codes"). */
function weatherLabel(code, isDay = 1) {
	if (code === 0) return {
		icon: isDay ? "☀️" : "🌙",
		label: "Clear"
	};
	if (code <= 2) return {
		icon: isDay ? "🌤️" : "☁️",
		label: code === 1 ? "Mainly clear" : "Partly cloudy"
	};
	if (code === 3) return {
		icon: "☁️",
		label: "Overcast"
	};
	if (code <= 48) return {
		icon: "🌫️",
		label: "Fog"
	};
	if (code <= 57) return {
		icon: "🌦️",
		label: "Drizzle"
	};
	if (code <= 67) return {
		icon: "🌧️",
		label: "Rain"
	};
	if (code <= 77) return {
		icon: "🌨️",
		label: "Snow"
	};
	if (code <= 82) return {
		icon: "🌧️",
		label: "Showers"
	};
	if (code <= 86) return {
		icon: "🌨️",
		label: "Snow showers"
	};
	return {
		icon: "⛈️",
		label: "Thunderstorm"
	};
}
// ../../packages/data/src/search.ts
var SEARCH_ATTRIBUTION = "Search by Photon (komoot), © OpenStreetMap contributors";
/**
* Coordinates as people type them: "53.068, -4.076", "53.068 -4.076",
* "53.068° N 4.076° W", "N53.068 W4.076". Latitude first. Null if it isn't coordinates.
*/
function parseCoordinates(text) {
	const t = text.trim().toUpperCase().replace(/°/g, " ");
	const m = /^([NS])?\s*(-?\d+(?:\.\d+)?)\s*([NS])?\s*[,;\s]\s*([EW])?\s*(-?\d+(?:\.\d+)?)\s*([EW])?$/.exec(t);
	if (!m) return null;
	let lat = +m[2];
	let lon = +m[5];
	if ((m[1] ?? m[3]) === "S") lat = -Math.abs(lat);
	if ((m[4] ?? m[6]) === "W") lon = -Math.abs(lon);
	if (Math.abs(lat) > 85 || Math.abs(lon) > 180) return null;
	return {
		lon,
		lat
	};
}
/** A few places worth seeing, for a first click. */
var SUGGESTIONS = [
	{
		name: "Yr Wyddfa (Snowdon)",
		lat: 53.0685,
		lon: -4.0763
	},
	{
		name: "Helvellyn",
		lat: 54.5272,
		lon: -3.0164
	},
	{
		name: "Ben Nevis",
		lat: 56.7969,
		lon: -5.0036
	},
	{
		name: "Matterhorn",
		lat: 45.9763,
		lon: 7.6586
	},
	{
		name: "Grand Canyon",
		lat: 36.0997,
		lon: -112.1124
	},
	{
		name: "Mount Fuji",
		lat: 35.3606,
		lon: 138.7274
	}
];
// ../../packages/data/src/sky.ts
var RAD = Math.PI / 180;
var E = RAD * 23.4397;
var daysSinceJ2000 = (epochSec) => epochSec / 86400 - 10957.5;
var siderealTime = (d, lonRad) => RAD * (280.16 + 360.9856235 * d) + lonRad;
function horizon(ra, dec, d, lat, lon) {
	const H = siderealTime(d, lon * RAD) - ra;
	const phi = lat * RAD;
	return {
		alt: Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H)),
		az: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI
	};
}
function sunAt(epochSec, lat, lon) {
	const d = daysSinceJ2000(epochSec);
	const M = RAD * (357.5291 + .98560028 * d);
	const L = M + RAD * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + 3e-4 * Math.sin(3 * M)) + RAD * 102.9372 + Math.PI;
	return horizon(Math.atan2(Math.sin(L) * Math.cos(E), Math.cos(L)), Math.asin(Math.sin(E) * Math.sin(L)), d, lat, lon);
}
function moonAt(epochSec, lat, lon) {
	const d = daysSinceJ2000(epochSec);
	const L = RAD * (218.316 + 13.176396 * d);
	const M = RAD * (134.963 + 13.064993 * d);
	const F = RAD * (93.272 + 13.22935 * d);
	const l = L + RAD * 6.289 * Math.sin(M);
	const b = RAD * 5.128 * Math.sin(F);
	return horizon(Math.atan2(Math.sin(l) * Math.cos(E) - Math.tan(b) * Math.sin(E), Math.cos(l)), Math.asin(Math.sin(b) * Math.cos(E) + Math.cos(b) * Math.sin(E) * Math.sin(l)), d, lat, lon);
}
/** Unit vector towards a sky body in the scene (x east, y up, z south: north is -z). */
function direction$1(b) {
	return [
		Math.sin(b.az) * Math.cos(b.alt),
		Math.sin(b.alt),
		-Math.cos(b.az) * Math.cos(b.alt)
	];
}
var STOPS = [
	{
		at: -14,
		top: "#1d2748",
		bottom: "#3d4c72",
		light: "#8fa6d8"
	},
	{
		at: -5,
		top: "#40558a",
		bottom: "#d9a2a0",
		light: "#c9b3d6"
	},
	{
		at: 1,
		top: "#7fa6d4",
		bottom: "#f6c49b",
		light: "#ffc58a"
	},
	{
		at: 10,
		top: "#a9d0f0",
		bottom: "#f7e6cf",
		light: "#fff0d8"
	},
	{
		at: 30,
		top: "#bfe1f7",
		bottom: "#f3f8fb",
		light: "#ffffff"
	}
];
function band(deg) {
	if (deg <= STOPS[0].at) return {
		a: STOPS[0],
		b: STOPS[0],
		f: 0
	};
	for (let k = 0; k < STOPS.length - 1; k++) if (deg <= STOPS[k + 1].at) return {
		a: STOPS[k],
		b: STOPS[k + 1],
		f: (deg - STOPS[k].at) / (STOPS[k + 1].at - STOPS[k].at)
	};
	const last = STOPS[STOPS.length - 1];
	return {
		a: last,
		b: last,
		f: 0
	};
}
/**
* Sky gradient and light colour for a sun height, greyed by cloud (0..1) and darkened a little
* by rain (0..1).
*/
function skyColours(sunAltRad, cloud, rain) {
	const { a, b, f } = band(sunAltRad / RAD);
	const daylight = Math.max(.15, Math.min(1, (sunAltRad / RAD + 8) / 14));
	const grey = Math.min(.75, cloud * .55 + rain * .25) * daylight;
	const mix = (x, y, overcast) => interpolateRgb(interpolateRgb(x, y)(f), overcast)(grey);
	return {
		top: mix(a.top, b.top, "#aeb8c2"),
		bottom: mix(a.bottom, b.bottom, "#d7dce0"),
		light: interpolateRgb(a.light, b.light)(f)
	};
}
// ../../packages/puck/src/lib/imagery.ts
var SOURCES = {
	satellite: {
		label: "Satellite",
		url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
		maxZoom: 16,
		attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
		photo: true
	},
	sentinel: {
		label: "Sentinel-2",
		url: (z, x, y) => `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/${z}/${y}/${x}.jpg`,
		maxZoom: 14,
		attribution: "Sentinel-2 cloudless 2023 by EOX IT Services GmbH (modified Copernicus Sentinel data), CC BY-NC-SA 4.0",
		photo: true
	},
	topo: {
		label: "Topo",
		url: (z, x, y) => `https://${"abc"[(x + y) % 3]}.tile.opentopomap.org/${z}/${x}/${y}.png`,
		maxZoom: 15,
		attribution: "© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors, SRTM",
		photo: false
	}
};
var tileCache = /* @__PURE__ */ new Map();
function loadTile(url) {
	let p = tileCache.get(url);
	if (!p) {
		p = new Promise((resolve) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => resolve(img);
			img.onerror = () => resolve(null);
			img.src = url;
		});
		tileCache.set(url, p);
		if (tileCache.size > 600) tileCache.delete(tileCache.keys().next().value);
	}
	return p;
}
/** at most this many tiles across: a 2048 px texture */
var TILES = 8;
/** The imagery on the land: one canvas texture, painted in as its tiles arrive. */
var Imagery = class {
	surface = "painted";
	canvas = document.createElement("canvas");
	texture;
	/** texture u, v as affine maps of local metres: u = dot(imgU, (x, n, 1)) */
	imgU = new Vector3(0, 0, -10);
	imgV = new Vector3(0, 0, -10);
	ctx = this.canvas.getContext("2d");
	generation = 0;
	centre = null;
	reach = 0;
	constructor() {
		this.canvas.width = this.canvas.height = TILES * 256;
		this.texture = new CanvasTexture(this.canvas);
		this.texture.colorSpace = SRGBColorSpace;
		this.texture.minFilter = LinearFilter;
		this.texture.generateMipmaps = false;
	}
	get mix() {
		return this.surface === "painted" ? 0 : 1;
	}
	get photo() {
		return this.surface !== "painted" && SOURCES[this.surface].photo;
	}
	get attribution() {
		return this.surface === "painted" ? null : SOURCES[this.surface].attribution;
	}
	/** Show this surface for the land within `reach` metres of a place. */
	show(surface, centre, reach) {
		if (surface === this.surface && centre === this.centre && reach === this.reach) return;
		this.surface = surface;
		this.centre = centre;
		this.reach = reach;
		const gen = ++this.generation;
		if (surface === "painted") return;
		const src = SOURCES[surface];
		const z = zoomFor(reach, centre.lat, TILES, src.maxZoom);
		const tx0 = Math.floor(mercX(centre.lon, z) - TILES / 2);
		const ty0 = Math.floor(mercY(centre.lat, z) - TILES / 2);
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.texture.needsUpdate = true;
		const plane = localPlane(centre);
		const uv = (x, n) => {
			const [lon, lat] = plane.toLonLat(x, n);
			return [(mercX(lon, z) - tx0) / TILES, 1 - (mercY(lat, z) - ty0) / TILES];
		};
		const [u0, v0] = uv(0, 0);
		const [ue, ve] = uv(100, 0);
		const [un, vn] = uv(0, 100);
		this.imgU.set((ue - u0) / 100, (un - u0) / 100, u0);
		this.imgV.set((ve - v0) / 100, (vn - v0) / 100, v0);
		let pending = 0;
		for (let j = 0; j < TILES; j++) for (let i = 0; i < TILES; i++) {
			pending++;
			loadTile(src.url(z, tx0 + i, ty0 + j)).then((img) => {
				if (gen !== this.generation) return;
				if (img) this.ctx.drawImage(img, i * 256, j * 256);
				if (--pending % 6 === 0 || pending === 0) this.texture.needsUpdate = true;
			});
		}
	}
	dispose() {
		this.texture.dispose();
	}
};
// ../../packages/puck/src/lib/FrameGovernor.svelte
var pace = { busyUntil: 0 };
var busy = (ms = 250) => pace.busyUntil = Math.max(pace.busyUntil, performance.now() + ms);
function FrameGovernor($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { playing } = $$props;
		const { renderer, scheduler, dom } = useThrelte();
		matchMedia("(max-width: 900px), (pointer: coarse)").matches;
	});
}
// ../../node_modules/@threlte/extras/dist/lib/storeUtils.js
var toCurrentReadable = (store) => {
	return {
		subscribe: store.subscribe,
		get current() {
			return store.current;
		}
	};
};
// ../../node_modules/@threlte/extras/dist/hooks/useProgress.js
var previousTotalLoaded = 0;
var finishedOnce = currentWritable(false);
var activeStore = currentWritable(false);
var itemStore = currentWritable(void 0);
var loadedStore = currentWritable(0);
var totalStore = currentWritable(0);
var errorsStore = currentWritable([]);
var progressStore = currentWritable(0);
var { onStart, onLoad, onError } = DefaultLoadingManager;
DefaultLoadingManager.onStart = (url, loaded, total) => {
	onStart?.(url, loaded, total);
	activeStore.set(true);
	itemStore.set(url);
	loadedStore.set(loaded);
	totalStore.set(total);
	const progress = (loaded - previousTotalLoaded) / (total - previousTotalLoaded);
	progressStore.set(progress);
	if (progress === 1) finishedOnce.set(true);
};
DefaultLoadingManager.onLoad = () => {
	onLoad?.();
	activeStore.set(false);
};
DefaultLoadingManager.onError = (url) => {
	onError?.(url);
	errorsStore.update((errors) => {
		return [...errors, url];
	});
};
DefaultLoadingManager.onProgress = (url, loaded, total) => {
	if (loaded === total) previousTotalLoaded = total;
	activeStore.set(true);
	itemStore.set(url);
	loadedStore.set(loaded);
	totalStore.set(total);
	const progress = (loaded - previousTotalLoaded) / (total - previousTotalLoaded) || 1;
	progressStore.set(progress);
	if (progress === 1) finishedOnce.set(true);
};
toCurrentReadable(activeStore), toCurrentReadable(itemStore), toCurrentReadable(loadedStore), toCurrentReadable(totalStore), toCurrentReadable(errorsStore), toCurrentReadable(progressStore), toCurrentReadable(finishedOnce);
new Vector3();
new Vector3();
new Vector3();
// ../../node_modules/@threlte/extras/dist/components/controls/useControlsContext.js
/**
* ### `useControlsContext`
*
* Internal registry of the controls instances mounted within the current
* `<Canvas>`. Each controls component (`<OrbitControls>`,
* `<TrackballControls>`, `<CameraControls>`, `<TransformControls>`) registers
* itself here on mount and clears its entry on unmount.
*
* It powers two things:
* - `<TransformControls>` reads the camera controls to enable/disable them
*   while a transform gizmo is being dragged.
* - The public `useCameraControls`, `useOrbitControls`, `useTrackballControls`
*   and `useTransformControls` hooks expose the registered instance to user
*   code.
*/
var useControlsContext = () => {
	return useThrelteUserContext("threlte-controls", {
		orbitControls: writable(void 0),
		trackballControls: writable(void 0),
		cameraControls: writable(void 0),
		transformControls: writable(void 0)
	});
};
new Sphere();
new Matrix4();
new Ray();
new Vector3();
// ../../node_modules/@threlte/extras/dist/suspense/context.js
var suspenseContextIdentifier = Symbol("THRELTE_SUSPENSE_CONTEXT_IDENTIFIER");
// ../../node_modules/@threlte/extras/dist/suspense/useSuspense.js
/**
* This hook is used to suspend the component until the promise is resolved.
* It also works outside the boundaries of the <Suspense> component.
*/
var useSuspense = () => {
	const ctx = getContext(suspenseContextIdentifier);
	const promises = /* @__PURE__ */ new Set();
	const suspend = (promise) => {
		if (ctx) {
			ctx.suspend(promise);
			promises.add(promise);
		}
		return promise;
	};
	const state = { suspended: derived$1(ctx?.suspended ?? readable(false), (suspended) => suspended) };
	onDestroy(() => {
		if (!ctx) return;
		for (const promise of promises) ctx.onComponentDestroy(promise);
		promises.clear();
	});
	return Object.assign(suspend, state);
};
// ../../node_modules/@threlte/extras/dist/components/Decal/Decal.svelte
new Vector3();
new Matrix4();
new Vector3();
new Vector3();
new Object3D();
// ../../node_modules/@threlte/extras/dist/components/HTML/shaders.js
/**
* These shaders add support for the logarithmicDepthBuffer.
*/
var logVertex = `
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}`;
var logFragment = `
#include <logdepthbuf_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4(0.0,0.0,0.0,0.0);
}`;
var spriteVertex = `
#include <common>
#include <logdepthbuf_pars_vertex>

void main() {
  vec2 center = vec2(0., 1.);
  float rotation = 0.0;
  
  // This is somewhat arbitrary, but it seems to work well
  // Need to figure out how to derive this dynamically if it even matters
  float size = 0.03;

  vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
  vec2 scale = vec2(
    length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) ),
    length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) )
  );

  bool isPerspective = isPerspectiveMatrix( projectionMatrix );
  if ( isPerspective ) scale *= - mvPosition.z;

  vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale * size;
  vec2 rotatedPosition;
  rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
  rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
  mvPosition.xy += rotatedPosition;

  gl_Position = projectionMatrix * mvPosition;
  #include <logdepthbuf_vertex>
}`;
// ../../node_modules/@threlte/extras/dist/components/HTML/utils.js
var v1 = new Vector3();
var v2 = new Vector3();
var v3 = new Vector3();
var vec2 = new Vector2();
var defaultCalculatePosition = (obj, camera, size) => {
	const objectPos = v1.setFromMatrixPosition(obj.matrixWorld);
	objectPos.project(camera);
	const widthHalf = size.width / 2;
	const heightHalf = size.height / 2;
	return [objectPos.x * widthHalf + widthHalf, -(objectPos.y * heightHalf) + heightHalf];
};
var isObjectBehindCamera = (el, camera) => {
	const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
	const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
	const deltaCamObj = objectPos.sub(cameraPos);
	const camDir = camera.getWorldDirection(v3);
	return deltaCamObj.dot(camDir) < 0;
};
var isObjectVisible = (el, camera, raycaster, occlude) => {
	const elPos = v1.setFromMatrixPosition(el.matrixWorld);
	const screenPos = v2.copy(v1);
	screenPos.project(camera);
	raycaster.setFromCamera(vec2.set(screenPos.x, screenPos.y), camera);
	const intersects = raycaster.intersectObjects(occlude, true);
	if (intersects.length) {
		const intersectionDistance = intersects[0].distance;
		return elPos.distanceTo(raycaster.ray.origin) < intersectionDistance;
	}
	return true;
};
var objectScale = (el, camera) => {
	if (isInstanceOf(camera, "OrthographicCamera")) return camera.zoom;
	else if (isInstanceOf(camera, "PerspectiveCamera")) {
		const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
		const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
		const vFOV = camera.fov * Math.PI / 180;
		const dist = objectPos.distanceTo(cameraPos);
		return 1 / (2 * Math.tan(vFOV / 2) * dist);
	} else return 1;
};
var objectZIndex = (el, camera, zIndexRange) => {
	const objectPos = v1.setFromMatrixPosition(el.matrixWorld);
	const cameraPos = v2.setFromMatrixPosition(camera.matrixWorld);
	const dist = objectPos.distanceTo(cameraPos);
	const A = (zIndexRange[1] - zIndexRange[0]) / (camera.far - camera.near);
	const B = zIndexRange[1] - A * camera.far;
	return Math.round(A * dist + B);
};
var getViewportFactor = (camera, target, size) => {
	if (isInstanceOf(camera, "OrthographicCamera")) return 1;
	if (isInstanceOf(camera, "PerspectiveCamera")) {
		const { width, height } = size;
		const distance = camera.getWorldPosition(v1).distanceTo(target);
		const fov = camera.fov * Math.PI / 180;
		return width / (2 * Math.tan(fov / 2) * distance * (width / height));
	}
	throw new Error("getViewportFactor needs a Perspective or Orthographic Camera");
};
// ../../node_modules/@threlte/extras/dist/components/HTML/HTML.svelte
function HTML($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { autoRender = true, eps = .001, center = false, fullscreen = false, portal, distanceFactor, sprite = false, transform = false, occlude = false, castShadow = false, receiveShadow = false, material, geometry, zIndexRange = [16777271, 0], calculatePosition = defaultCalculatePosition, as = "div", wrapperClass, pointerEvents = "auto", ref = void 0, visible = void 0, children, $$slots, $$events, ...props } = $$props;
		visible = true;
		const { camera, scene, size, dom, canvas, renderStage } = useThrelte();
		const group = new Group();
		let element$1;
		let oldZoom = 0;
		let oldX = 0;
		let oldY = 0;
		let cachedZIndexNum = Number.MIN_SAFE_INTEGER;
		let cachedTransform = "";
		let isMeshSizeSet = false;
		const occlusionMesh = new Mesh();
		const raycaster = new Raycaster();
		new Matrix4();
		const viewportTarget = new Vector3();
		const isRayCastOcclusion = derived(() => !!occlude && occlude !== "blending");
		const viewportFactor = derived(() => getViewportFactor(store_get($$store_subs ??= {}, "$camera", camera), viewportTarget, store_get($$store_subs ??= {}, "$size", size)));
		const zRange = derived(() => {
			if (!occlude) return zIndexRange;
			const halfRange = Math.floor(zIndexRange[0] / 2);
			return isRayCastOcclusion() ? [zIndexRange[0], halfRange] : [halfRange - 1, 0];
		});
		const render = () => {
			camera.current.updateMatrixWorld();
			group.updateWorldMatrix(true, false);
			const vec = transform ? null : calculatePosition(group, camera.current, store_get($$store_subs ??= {}, "$size", size));
			if (transform || vec && (Math.abs(oldZoom - camera.current.zoom) > eps || Math.abs(oldX - vec[0]) > eps || Math.abs(oldY - vec[1]) > eps)) {
				const isBehindCamera = isObjectBehindCamera(group, camera.current);
				let raytraceTarget = false;
				if (isRayCastOcclusion()) {
					if (Array.isArray(occlude)) raytraceTarget = occlude;
					else if (occlude !== "blending") raytraceTarget = [scene];
				}
				const previouslyVisible = visible;
				if (raytraceTarget) visible = isObjectVisible(group, camera.current, raycaster, raytraceTarget) && !isBehindCamera;
				else visible = !isBehindCamera;
				if (previouslyVisible !== visible) {
					if (props.onvisibilitychange) props.onvisibilitychange(visible);
					else element$1.style.display = visible ? "block" : "none";
				}
				const zIndexNum = objectZIndex(group, camera.current, zRange());
				if (cachedZIndexNum !== zIndexNum) {
					element$1.style.zIndex = `${zIndexNum}`;
					cachedZIndexNum = zIndexNum;
				}
				if (vec) {
					const scale = distanceFactor === void 0 ? 1 : objectScale(group, camera.current) * distanceFactor;
					const newTransform = `translate3d(${vec[0]}px,${vec[1]}px,0) scale(${scale})`;
					if (cachedTransform !== newTransform) {
						element$1.style.transform = newTransform;
						cachedTransform = newTransform;
					}
				}
				if (vec) {
					oldX = vec[0];
					oldY = vec[1];
				}
				oldZoom = camera.current.zoom;
			}
			if (!isRayCastOcclusion() && !isMeshSizeSet) {
				const el = element$1.children[0];
				if (el?.clientWidth && el?.clientHeight) {
					const ratio = 1 / viewportFactor();
					const w = el.clientWidth * ratio;
					const h = el.clientHeight * ratio;
					occlusionMesh.scale.set(w, h, 1);
					isMeshSizeSet = true;
				}
				occlusionMesh.lookAt(camera.current.position);
			}
		};
		useTask(render, {
			autoInvalidate: false,
			stage: renderStage,
			running: () => autoRender
		});
		const { suspended } = useSuspense();
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			T$1($$renderer, spread_props([
				{ is: group },
				props,
				{
					get ref() {
						return ref;
					},
					set ref($$value) {
						ref = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						if (occlude && !isRayCastOcclusion()) {
							$$renderer.push("<!--[0-->");
							T$1($$renderer, {
								is: occlusionMesh,
								castShadow,
								receiveShadow,
								children: ($$renderer) => {
									if (geometry) {
										$$renderer.push("<!--[0-->");
										T$1($$renderer, { is: geometry });
									} else {
										$$renderer.push("<!--[-1-->");
										if (T$1.PlaneGeometry) {
											$$renderer.push("<!--[-->");
											T$1.PlaneGeometry($$renderer, {});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
									}
									$$renderer.push(`<!--]--> `);
									if (material) {
										$$renderer.push("<!--[0-->");
										T$1($$renderer, { is: material });
									} else if (!transform) {
										$$renderer.push("<!--[1-->");
										if (T$1.ShaderMaterial) {
											$$renderer.push("<!--[-->");
											T$1.ShaderMaterial($$renderer, {
												side: DoubleSide,
												vertexShader: spriteVertex,
												fragmentShader: logFragment
											});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
									} else {
										$$renderer.push("<!--[-1-->");
										if (T$1.ShaderMaterial) {
											$$renderer.push("<!--[-->");
											T$1.ShaderMaterial($$renderer, {
												side: DoubleSide,
												vertexShader: logVertex,
												fragmentShader: logFragment
											});
											$$renderer.push("<!--]-->");
										} else {
											$$renderer.push("<!--[!-->");
											$$renderer.push("<!--]-->");
										}
									}
									$$renderer.push(`<!--]-->`);
								},
								$$slots: { default: true }
							});
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					},
					$$slots: { default: true }
				}
			]));
			$$renderer.push(`<!----> `);
			element($$renderer, as, () => {
				$$renderer.push(`${attr_class(clsx(wrapperClass))}${attr_style("", {
					position: "absolute",
					top: "0",
					left: "0",
					"pointer-events": transform ? "none" : void 0,
					overflow: transform ? "hidden" : void 0,
					"transform-origin": transform ? void 0 : "0 0",
					display: store_get($$store_subs ??= {}, "$suspended", suspended) ? "none" : void 0
				})}`);
			}, () => {
				if (transform) {
					$$renderer.push(`<!--[0--><div${attr_style("", {
						position: "absolute",
						top: "0",
						left: "0",
						"transform-style": "preserve-3d",
						"pointer-events": "none",
						width: `${store_get($$store_subs ??= {}, "$size", size).width}px`,
						height: `${store_get($$store_subs ??= {}, "$size", size).height}px`
					})}><div${attr_style("", {
						position: "absolute",
						"pointer-events": pointerEvents
					})}><div${attr_class(clsx(props.class))}${attr_style(props.style)}>`);
					children?.($$renderer, { render });
					$$renderer.push(`<!----></div></div></div>`);
				} else {
					$$renderer.push(`<!--[-1--><div${attr_style(props.style, {
						position: "absolute",
						transform: center ? "translate3d(-50%,-50%,0)" : "none",
						top: fullscreen ? `${-store_get($$store_subs ??= {}, "$size", size).height / 2}px` : void 0,
						left: fullscreen ? `${-store_get($$store_subs ??= {}, "$size", size).width / 2}px` : void 0,
						width: fullscreen ? `${store_get($$store_subs ??= {}, "$size", size).width}px` : void 0,
						height: fullscreen ? `${store_get($$store_subs ??= {}, "$size", size).height}px` : void 0
					})}${attr_class(clsx(props.class))}>`);
					children?.($$renderer, { render });
					$$renderer.push(`<!----></div>`);
				}
				$$renderer.push(`<!--]-->`);
			});
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, {
			ref,
			visible,
			render
		});
	});
}
[
	1,
	1,
	1,
	-1,
	1,
	1,
	1,
	-1,
	1,
	-1,
	-1,
	1,
	1,
	1,
	-1,
	-1,
	1,
	-1,
	1,
	-1,
	-1,
	-1,
	-1,
	-1
].map((value) => value * .85);
[
	0,
	1,
	1,
	0,
	-1,
	1,
	1,
	0,
	1,
	-1,
	0,
	1,
	0,
	1,
	-1,
	0,
	-1,
	-1,
	1,
	0,
	-1,
	-1,
	0,
	-1,
	1,
	1,
	0,
	1,
	-1,
	0,
	-1,
	1,
	0,
	-1,
	-1,
	0
].map((value) => value * .925);
new Vector3(0, 1, 0);
new Vector3();
new Vector3();
new Vector3();
new Vector3(0, 1, 0);
new Vector3();
new Quaternion();
new Quaternion();
new Matrix4();
new Spherical();
new Vector2();
new Vector3();
new Vector3();
new Vector3();
new Vector3();
new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, -1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1);
new Vector4();
new Raycaster();
new Vector2();
// ../../node_modules/@threlte/extras/dist/components/controls/OrbitControls/OrbitControls.svelte
function OrbitControls_1($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$store_subs;
		let { camera, ref = void 0, children, $$slots, $$events, ...props } = $$props;
		const { dom, camera: defaultCamera, invalidate } = useThrelte();
		const parent = useParent_deprecated();
		const resolvedCamera = derived(() => camera ? camera : isInstanceOf(store_get($$store_subs ??= {}, "$parent", parent), "Camera") ? store_get($$store_subs ??= {}, "$parent", parent) : store_get($$store_subs ??= {}, "$defaultCamera", defaultCamera));
		const controls = new OrbitControls(run(() => resolvedCamera()), dom);
		const { orbitControls } = useControlsContext();
		useTask(() => {
			controls.update();
		}, {
			autoInvalidate: false,
			running: () => props.autoRotate || props.enableDamping || false
		});
		const handleChange = (event) => {
			invalidate();
			props.onchange?.(event);
		};
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			T$1($$renderer, spread_props([
				{ is: controls },
				props,
				{
					onchange: handleChange,
					get ref() {
						return ref;
					},
					set ref($$value) {
						ref = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						children?.($$renderer, { ref: controls });
						$$renderer.push(`<!---->`);
					},
					$$slots: { default: true }
				}
			]));
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
		if ($$store_subs) unsubscribe_stores($$store_subs);
		bind_props($$props, { ref });
	});
}
new Matrix4();
new Matrix4();
new Mesh();
ShaderChunk.shadowmap_pars_fragment.includes("unpackRGBAToDepth");
`${ShaderChunk.logdepthbuf_pars_vertex}${ShaderChunk.fog_pars_vertex}${ShaderChunk.logdepthbuf_vertex}${ShaderChunk.fog_vertex}`;
`${ShaderChunk.tonemapping_fragment}${ShaderChunk.colorspace_fragment}`;
`${ShaderChunk.tonemapping_fragment}${ShaderChunk.colorspace_fragment}`;
`${shaderStructs}${shaderIntersectFunction}${ShaderChunk.tonemapping_fragment}${ShaderChunk.colorspace_fragment}`;
new Box3();
typeof window !== "undefined" && document.createElement("div");
new SvelteMap();
new MeshBasicMaterial();
new Vector3();
new Matrix4();
new Ray();
new Sphere();
new Box3();
new Vector3();
new Vector3();
// ../../packages/puck/src/lib/GlobeWeather.svelte
function GlobeWeather($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { globe, show, presence } = $$props;
		const R = globe.R;
		const CLOUD_Y = R * .8;
		const MAX_CLOUDS = 5;
		const puffGeo = new SphereGeometry(1, 20, 14);
		const OPACITY = .82;
		const cloudMats = Array.from({ length: MAX_CLOUDS }, () => new MeshStandardMaterial({
			color: "#ffffff",
			emissive: "#ffffff",
			emissiveIntensity: .45,
			roughness: 1,
			transparent: true,
			opacity: OPACITY,
			depthWrite: false
		}));
		const rand = (() => {
			let s = 7;
			return () => (s = s * 16807 % 2147483647) / 2147483647;
		})();
		const clouds = Array.from({ length: MAX_CLOUDS }, (_, index) => {
			const g = new Group();
			const cloudMat = cloudMats[index];
			const size = R * (.05 + rand() * .035);
			for (let k = 0; k < 6; k++) {
				const m = new Mesh(puffGeo, cloudMat);
				const s = size * (.55 + rand() * .55);
				m.scale.set(s, s * .55, s);
				m.position.set((rand() - .5) * size * 2.4, (rand() - .3) * size * .5, (rand() - .5) * size * 1.2);
				g.add(m);
			}
			return {
				g,
				mat: cloudMat,
				lateral: (rand() - .5) * 1.3 * R,
				phase: rand(),
				lift: rand() * R * .12,
				on: 0
			};
		});
		const root = new Group();
		for (const c of clouds) root.add(c.g);
		const COUNT = 2500;
		const seeds = new Float32Array(COUNT * 2 * 3);
		const ends = new Float32Array(COUNT * 2);
		for (let i = 0; i < COUNT; i++) {
			const s = [
				Math.random(),
				Math.random(),
				Math.random()
			];
			seeds.set(s, i * 6);
			seeds.set(s, i * 6 + 3);
			ends[i * 2 + 1] = 1;
		}
		const rainGeo = new BufferGeometry();
		rainGeo.setAttribute("position", new BufferAttribute(new Float32Array(COUNT * 2 * 3), 3));
		rainGeo.setAttribute("aSeed", new BufferAttribute(seeds, 3));
		rainGeo.setAttribute("aEnd", new BufferAttribute(ends, 1));
		const rainMat = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: {
				uR: { value: R * .85 },
				uTop: { value: CLOUD_Y },
				uTime: { value: 0 },
				uWind: { value: new Vector3() },
				uIntensity: { value: 0 },
				uColor: { value: new Color("#6f8fb0") }
			},
			vertexShader: `
			uniform float uR;
			uniform float uTop;
			uniform float uTime;
			uniform vec3 uWind;
			uniform float uIntensity;
			attribute vec3 aSeed;
			attribute float aEnd;
			varying float vAlpha;
			void main() {
				float fall = uTop * 0.9;
				float ang = aSeed.x * 6.2831853;
				vec2 disc = vec2(cos(ang), sin(ang)) * sqrt(aSeed.z) * uR;
				float y = uTop - mod(aSeed.y * uTop + uTime * fall * (0.8 + 0.4 * fract(aSeed.x * 7.13)), uTop);
				vec3 p = vec3(disc.x, y, disc.y);
				// slant with the wind: drops drift downwind as they fall
				p.xz += uWind.xz * (uTop - y) / uTop * uR * 0.25;
				p += normalize(vec3(uWind.x * 0.3, -1.0, uWind.z * 0.3)) * aEnd * uR * 0.035;
				float live = step(fract(aSeed.x * 3.7 + aSeed.y * 1.3), uIntensity);
				// fade in just under the clouds
				vAlpha = live * smoothstep(uTop, uTop * 0.85, y) * (1.0 - aEnd * 0.7) * 0.7;
				gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
			}
		`,
			fragmentShader: `
			uniform vec3 uColor;
			varying float vAlpha;
			void main() {
				if (vAlpha <= 0.0) discard;
				gl_FragColor = vec4(uColor, vAlpha);
			}
		`
		});
		const white = new Color("#ffffff");
		const rainy = new Color("#9aa5b1");
		const downwind = new Vector3(0, 0, 1);
		const across = new Vector3(1, 0, 0);
		let t = 0;
		useTask((dt) => {
			t += dt;
			const w = globe.weather;
			const cover = show && w ? w.cloud / 100 : 0;
			const mph = w?.wind ?? 5;
			if (w) {
				const to = (w.windDir + 180) * Math.PI / 180;
				downwind.set(Math.sin(to), 0, -Math.cos(to));
				across.set(-downwind.z, 0, downwind.x);
			}
			const span = R * 2;
			const speed = R * .012 * (1 + mph / 6);
			const n = Math.round(cover * MAX_CLOUDS);
			const here = Math.min(1, Math.max(0, presence?.() ?? 1));
			clouds.forEach((c, k) => {
				c.on += ((k < n ? 1 : 0) - c.on) * Math.min(1, dt * .8);
				const s = Math.min(1, Math.max(0, (here - k * .1) / .5));
				const settle = s * s * (3 - 2 * s);
				const amount = c.on * settle;
				c.g.visible = amount > .005;
				if (!c.g.visible) return;
				c.mat.color.copy(white).lerp(rainy, globe.rain);
				c.mat.emissive.copy(white).lerp(rainy, globe.rain);
				c.mat.opacity = OPACITY * amount;
				const along = ((c.phase * span + t * speed) % span + span) % span - span / 2;
				const pos = downwind.clone().multiplyScalar(along).add(across.clone().multiplyScalar(c.lateral));
				const edge = Math.hypot(pos.x, pos.z) / R;
				c.g.scale.setScalar(Math.max(.001, (1 - Math.max(0, edge - .6) / .35) * (.7 + .3 * amount)));
				c.g.position.set(pos.x, CLOUD_Y + c.lift + (1 - settle) * R * .5, pos.z);
			});
			const u = rainMat.uniforms;
			u.uTime.value = t;
			const r = Math.min(1, Math.max(0, (here - .5) / .5));
			u.uIntensity.value = show ? globe.rain * r * r * (3 - 2 * r) : 0;
			u.uWind.value.copy(downwind).multiplyScalar(Math.min(1, mph / 25));
		});
		T$1($$renderer, { is: root });
		$$renderer.push(`<!----> `);
		if (T$1.LineSegments) {
			$$renderer.push("<!--[-->");
			T$1.LineSegments($$renderer, {
				geometry: rainGeo,
				material: rainMat,
				frustumCulled: false,
				renderOrder: 20
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
// ../../packages/puck/src/lib/state.ts
var GlobeState = class {
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
	patch = {
		x: NaN,
		n: NaN,
		reach: 0
	};
	sunDir = new Vector3(0, 1, 0);
	moonDir = new Vector3(0, -1, 0);
	/** colour and strength of the main light (sun by day, moon by night) */
	light = new Color("#ffffff");
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
};
// ../../packages/puck/src/lib/lighting.ts
/** The light on the globe right now (null until the first scene sets it). */
var light = {
	set: false,
	colour: new Color("#fff4e0"),
	strength: 1.375,
	dir: new Vector3(-.5, .75, .4).normalize(),
	daylight: 1,
	hemi: 1.4,
	hemiColour: new Color("#dfeef7")
};
/** Ease the carried light towards this scene's goal (about a second to settle); returns it. */
function easeLight(goal, dt) {
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
// ../../packages/puck/src/lib/GlobeOverview.svelte
function GlobeOverview($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { rise } = $$props;
		const V = 1800;
		/** the meadow stands this far above the plinth, on a band of earth */
		const TURF = V * .05;
		const globe = new GlobeState(V);
		globe.weather = {
			cloud: 35,
			wind: 8,
			windDir: 250,
			precip: 0,
			code: 2,
			isDay: 1
		};
		function meadow() {
			const S = 1024;
			const c = document.createElement("canvas");
			c.width = c.height = S;
			const ctx = c.getContext("2d");
			ctx.fillStyle = "#b9d99b";
			ctx.fillRect(0, 0, S, S);
			const rand = (() => {
				let s = 11;
				return () => (s = s * 16807 % 2147483647) / 2147483647;
			})();
			const tones = [
				"#b0d392",
				"#c3dfa6",
				"#a8cc8c",
				"#d8dca0",
				"#bfdb9f"
			];
			for (let i = 0; i < 26; i++) {
				ctx.fillStyle = tones[i % tones.length];
				ctx.globalAlpha = .55;
				ctx.beginPath();
				const x = rand() * S;
				const y = rand() * S;
				const w = 120 + rand() * 220;
				const h = 90 + rand() * 180;
				ctx.ellipse(x, y, w / 2, h / 2, rand() * Math.PI, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			const N = 6;
			const cell = S / N;
			const pt = Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => [c * cell + (c % N ? (rand() - .5) * cell * .5 : 0), r * cell + (r % N ? (rand() - .5) * cell * .5 : 0)]));
			ctx.strokeStyle = "#86ab6c";
			ctx.lineWidth = 6;
			ctx.lineCap = "round";
			const trees = [];
			const hedge = (a, b) => {
				if (rand() < .25) return;
				ctx.beginPath();
				ctx.moveTo(a[0], a[1]);
				ctx.quadraticCurveTo((a[0] + b[0]) / 2 + (rand() - .5) * 30, (a[1] + b[1]) / 2 + (rand() - .5) * 30, b[0], b[1]);
				ctx.stroke();
				for (let k = 0; k < 2; k++) {
					const t = rand();
					if (rand() < .6) trees.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
				}
			};
			for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
				if (c < N) hedge(pt[r][c], pt[r][c + 1]);
				if (r < N) hedge(pt[r][c], pt[r + 1][c]);
			}
			ctx.fillStyle = "#6f9a58";
			for (const [x, y] of trees) {
				ctx.beginPath();
				ctx.arc(x, y, 7 + rand() * 6, 0, Math.PI * 2);
				ctx.fill();
			}
			const road = (w, style, dash = []) => {
				ctx.strokeStyle = style;
				ctx.lineWidth = w;
				ctx.setLineDash(dash);
				ctx.beginPath();
				ctx.moveTo(-20, S * .56);
				ctx.bezierCurveTo(S * .3, S * .64, S * .4, S * .5, S * .5, S * .5);
				ctx.bezierCurveTo(S * .62, S * .5, S * .72, S * .38, 1044, S * .42);
				ctx.stroke();
				ctx.setLineDash([]);
			};
			road(34, "#9fb58a");
			road(26, "#e8e3d7");
			road(3, "#c9bfa9", [16, 16]);
			const t = new CanvasTexture(c);
			t.colorSpace = SRGBColorSpace;
			t.anisotropy = 8;
			return t;
		}
		function earth() {
			const c = document.createElement("canvas");
			c.width = 1024;
			c.height = 128;
			const ctx = c.getContext("2d");
			const bands = [
				[0, "#8fb06f"],
				[.16, "#8a6a52"],
				[.42, "#c9ad8c"],
				[.7, "#b39c82"],
				[.86, "#d8ccb8"]
			];
			bands.forEach(([y, col], i) => {
				ctx.fillStyle = col;
				const next = bands[i + 1]?.[0] ?? 1;
				ctx.fillRect(0, y * 128, 1024, (next - y) * 128 + 1);
			});
			const t = new CanvasTexture(c);
			t.colorSpace = SRGBColorSpace;
			return t;
		}
		let meadowGroup = void 0;
		let grassMat = void 0;
		let soilMat = void 0;
		const goal = {
			colour: new Color("#fff4e0"),
			strength: 2.2 / 1.6,
			dir: new Vector3(-1.5, 2.2, 1.2).normalize(),
			daylight: 1,
			hemi: 1.4,
			hemiColour: new Color("#dfeef7")
		};
		let sunLight = void 0;
		let hemi = void 0;
		useTask((dt) => {
			const now = easeLight(goal, dt);
			if (sunLight) {
				sunLight.position.copy(now.dir).multiplyScalar(V * 3);
				sunLight.color.copy(now.colour);
				sunLight.intensity = now.strength * 1.6;
			}
			if (hemi) {
				hemi.intensity = now.hemi;
				hemi.color.copy(now.hemiColour);
			}
		});
		useTask(() => {
			const r = Math.max(.001, rise?.() ?? 1);
			if (meadowGroup) meadowGroup.scale.y = r;
			const u = Math.min(1, r / .18);
			const o = u * u * (3 - 2 * u);
			if (meadowGroup) meadowGroup.position.y = -(1 - o) * V * .03;
			for (const m of [grassMat, soilMat]) if (m) m.opacity = o;
		});
		const grass = meadow();
		const soil = earth();
		const rim = new CylinderGeometry(V, V, TURF, 160, 1, true);
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (T$1.HemisphereLight) {
				$$renderer.push("<!--[-->");
				T$1.HemisphereLight($$renderer, {
					args: [
						"#dfeef7",
						"#d8cbb4",
						1.4
					],
					get ref() {
						return hemi;
					},
					set ref($$value) {
						hemi = $$value;
						$$settled = false;
					}
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			if (T$1.DirectionalLight) {
				$$renderer.push("<!--[-->");
				T$1.DirectionalLight($$renderer, {
					position: [
						-2700,
						V * 2.2,
						V * 1.2
					],
					intensity: 2.2,
					color: "#fff4e0",
					get ref() {
						return sunLight;
					},
					set ref($$value) {
						sunLight = $$value;
						$$settled = false;
					}
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			if (T$1.Group) {
				$$renderer.push("<!--[-->");
				T$1.Group($$renderer, {
					get ref() {
						return meadowGroup;
					},
					set ref($$value) {
						meadowGroup = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						if (T$1.Mesh) {
							$$renderer.push("<!--[-->");
							T$1.Mesh($$renderer, {
								geometry: rim,
								"position.y": TURF / 2,
								children: ($$renderer) => {
									if (T$1.MeshStandardMaterial) {
										$$renderer.push("<!--[-->");
										T$1.MeshStandardMaterial($$renderer, {
											map: soil,
											roughness: .95,
											transparent: true,
											get ref() {
												return soilMat;
											},
											set ref($$value) {
												soilMat = $$value;
												$$settled = false;
											}
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
						$$renderer.push(` `);
						if (T$1.Mesh) {
							$$renderer.push("<!--[-->");
							T$1.Mesh($$renderer, {
								"rotation.x": -Math.PI / 2,
								"position.y": TURF,
								children: ($$renderer) => {
									if (T$1.CircleGeometry) {
										$$renderer.push("<!--[-->");
										T$1.CircleGeometry($$renderer, { args: [V, 160] });
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
									$$renderer.push(` `);
									if (T$1.MeshStandardMaterial) {
										$$renderer.push("<!--[-->");
										T$1.MeshStandardMaterial($$renderer, {
											map: grass,
											roughness: .95,
											transparent: true,
											get ref() {
												return grassMat;
											},
											set ref($$value) {
												grassMat = $$value;
												$$settled = false;
											}
										});
										$$renderer.push("<!--]-->");
									} else {
										$$renderer.push("<!--[!-->");
										$$renderer.push("<!--]-->");
									}
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			GlobeWeather($$renderer, {
				globe,
				show: true,
				presence: rise
			});
			$$renderer.push(`<!---->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
// ../../packages/puck/src/lib/DioramaTerrain.svelte
function DioramaTerrain($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { puck, data, globe, imagery, fade } = $$props;
		const { radius: R, near, far, map } = data;
		const shared = {
			globe,
			imagery
		};
		const CELL = Math.max(20, Math.round(R / 90));
		const HALF = Math.ceil(R / CELL) + 2;
		const SIDE = HALF * 2 + 1;
		/**
		* earth below the lowest ground in the disc, as a share of the radius (before exaggeration): a
		* tenth of the radius once exaggerated, however tall the hills are stood (a wide, flat puck
		* with its relief stood up ×6 would otherwise sit on a cliff of earth)
		*/
		const DEPTH = .1 / Math.max(1, puck.exaggeration);
		/** best height we have: the sharp tiles, else the coarse ones; the sea is level at 0 */
		const ground = (x, n) => {
			let h = near(x, n);
			if (!Number.isFinite(h)) h = far(x, n);
			return Math.max(0, Number.isFinite(h) ? h : 0);
		};
		const positions = new Float32Array(SIDE * SIDE * 3);
		const normals = new Float32Array(SIDE * SIDE * 3);
		const wet = new Float32Array(SIDE * SIDE);
		const grid = new Float32Array(SIDE * SIDE);
		const index = [];
		for (let r = 0; r < SIDE - 1; r++) for (let c = 0; c < SIDE - 1; c++) {
			const a = r * SIDE + c;
			index.push(a, a + SIDE, a + 1, a + 1, a + SIDE, a + SIDE + 1);
		}
		const W = SIDE + 2;
		const hs = new Float32Array(W * W);
		for (let r = 0; r < W; r++) for (let c = 0; c < W; c++) hs[r * W + c] = ground((c - 1 - HALF) * CELL, -(r - 1 - HALF) * CELL);
		let low = Infinity;
		let high = -Infinity;
		for (let r = 0; r < SIDE; r++) for (let c = 0; c < SIDE; c++) {
			const x = (c - HALF) * CELL;
			const n = -(r - HALF) * CELL;
			const k = (r + 1) * W + (c + 1);
			const o = (r * SIDE + c) * 3;
			positions[o] = x;
			positions[o + 1] = hs[k];
			positions[o + 2] = -n;
			grid[r * SIDE + c] = hs[k];
			if (Math.hypot(x, n) < R) {
				low = Math.min(low, hs[k]);
				high = Math.max(high, hs[k]);
			}
			wet[r * SIDE + c] = map.waterAt(x, n);
			const nx = -(hs[k + 1] - hs[k - 1]);
			const ny = 2 * CELL;
			const nz = -(hs[k + W] - hs[k - W]);
			const len = Math.hypot(nx, ny, nz);
			normals[o] = nx / len;
			normals[o + 1] = ny / len;
			normals[o + 2] = nz / len;
		}
		const tall = high - Math.max(0, low) > 950;
		const geometry = new BufferGeometry();
		geometry.setIndex(index);
		geometry.setAttribute("position", new BufferAttribute(positions, 3));
		geometry.setAttribute("normal", new BufferAttribute(normals, 3));
		geometry.setAttribute("aWater", new BufferAttribute(wet, 1));
		/** Height from the grid, interpolated as the mesh draws it: for the lines and labels on the land. */
		function gridHeight(x, n) {
			const fc = Math.max(0, Math.min(SIDE - 1.001, x / CELL + HALF));
			const fr = Math.max(0, Math.min(SIDE - 1.001, -n / CELL + HALF));
			const c = Math.floor(fc);
			const r = Math.floor(fr);
			const a = fc - c;
			const b = fr - r;
			const i = r * SIDE + c;
			return (grid[i] * (1 - a) + grid[i + 1] * a) * (1 - b) + (grid[i + SIDE] * (1 - a) + grid[i + SIDE + 1] * a) * b;
		}
		shared.globe.baseGoal = low - DEPTH * R;
		if (!Number.isFinite(shared.globe.base)) shared.globe.base = shared.globe.baseGoal;
		shared.globe.ground = gridHeight;
		shared.globe.patch = {
			x: 0,
			n: 0,
			reach: R
		};
		shared.globe.version++;
		const LIGHT_GLSL = `
		uniform vec3 uLightDir;
		uniform vec3 uLight;
		uniform float uStrength;
		uniform float uDay;
		uniform float uFade;
		/** how much light falls on a surface facing n (about 0.35 in shade at night .. 0.95 in full sun) */
		vec3 lightAt(vec3 n) {
			float diff = max(dot(n, uLightDir), 0.0);
			vec3 sky = mix(vec3(0.34, 0.38, 0.52), vec3(0.62, 0.66, 0.70), uDay);
			vec3 k = sky + uLight * diff * uStrength;
			// soft ceiling: a clear midday sun can't wash the pastel land out
			vec3 over = max(k - 0.9, 0.0);
			return min(k, vec3(0.9)) + over / (1.0 + over * 3.0);
		}
		vec3 lit(vec3 base, vec3 n) {
			return base * lightAt(n);
		}
	`;
		const lightUniforms = () => ({
			uLightDir: { value: new Vector3(0, 1, 0) },
			uLight: { value: new Color("#ffffff") },
			uStrength: { value: 1 },
			uDay: { value: 1 },
			uExag: { value: 2 },
			uFade: { value: 1 }
		});
		const material = new ShaderMaterial({
			uniforms: {
				...lightUniforms(),
				uR: { value: R },
				uLow: { value: tall ? Math.max(0, low) : 0 },
				uSpan: { value: tall ? high - Math.max(0, low) : 950 },
				uTime: { value: 0 },
				uWater: { value: 1 },
				uContours: { value: 1 },
				uImg: { value: shared.imagery.texture },
				uImgU: { value: shared.imagery.imgU },
				uImgV: { value: shared.imagery.imgV },
				uMapMix: { value: 0 },
				uPhoto: { value: 0 }
			},
			vertexShader: `
			uniform float uExag;
			attribute float aWater;
			varying float vH;
			varying vec2 vXZ;
			varying vec3 vN;
			varying float vWater;
			void main() {
				vWater = aWater;
				vH = position.y;
				vXZ = position.xz;
				// the group is scaled by uExag on y: normals scale by the inverse
				vN = normalize(vec3(normal.x, normal.y / uExag, normal.z));
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
			fragmentShader: `
			${LIGHT_GLSL}
			uniform float uR;
			uniform float uLow;
			uniform float uSpan;
			uniform float uTime;
			uniform float uWater;
			uniform float uContours;
			uniform sampler2D uImg;
			uniform vec3 uImgU;
			uniform vec3 uImgV;
			uniform float uMapMix;
			uniform float uPhoto;
			const float PHOTO_EXPOSURE = 4.0;
			varying float vH;
			varying vec2 vXZ;
			varying vec3 vN;
			varying float vWater;

			// soft pastel land by height: meadow, heath, bracken, pale stone
			vec3 pastel(float h) {
				vec3 c = mix(vec3(0.72, 0.84, 0.60), vec3(0.80, 0.84, 0.58), smoothstep(0.0, 200.0, h));
				c = mix(c, vec3(0.86, 0.78, 0.60), smoothstep(200.0, 450.0, h));
				c = mix(c, vec3(0.80, 0.74, 0.68), smoothstep(450.0, 700.0, h));
				c = mix(c, vec3(0.93, 0.92, 0.90), smoothstep(700.0, 950.0, h));
				return c;
			}

			void main() {
				// cut the square grid to a circle
				float d = length(vXZ);
				if (d > uR) discard;
				vec3 n = normalize(vN);
				vec3 col = pastel((vH - uLow) / uSpan * 950.0);

				// the imagery: local metres -> texture uv (x east, n north = -z)
				vec3 xn1 = vec3(vXZ.x, -vXZ.y, 1.0);
				vec2 uv = vec2(dot(uImgU, xn1), dot(uImgV, xn1));
				vec4 tex = texture2D(uImg, uv);
				vec3 img = tex.rgb;
				// tiles still loading (or missing): the pastel land, not black
				float have = tex.a * step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
				// photographs are far darker than the pastel land: an exposure curve lifts the shadows
				// and mid-tones and rolls the highlights off towards white, on the brightness only (the
				// colours keep their hue). A printed map (topo) is already light: as it is.
				float l = dot(img, vec3(0.2126, 0.7152, 0.0722));
				float lifted = (1.0 - exp(-PHOTO_EXPOSURE * l)) / (1.0 - exp(-PHOTO_EXPOSURE));
				vec3 photo = img * (lifted / max(l, 1e-3));
				photo = mix(vec3(lifted), photo, 1.08);
				img = mix(img, clamp(photo, 0.0, 1.0), uPhoto);

				// water: pale, with a slow soft shimmer
				float w = smoothstep(0.42, 0.58, vWater) * uWater * (1.0 - 0.6 * uMapMix);
				float sea = step(vH, 0.5);
				float shimmer = sin(dot(vXZ, vec2(0.009, 0.004)) + uTime * 0.5) * sin(dot(vXZ, vec2(-0.003, 0.007)) - uTime * 0.3);
				vec3 water = vec3(0.62, 0.80, 0.90) + vec3(0.05) * shimmer;
				float wet = max(w, sea);
				n = normalize(mix(n, vec3(0.0, 1.0, 0.0), wet));
				vec3 sun = lightAt(n);
				// the pastel land takes the full hillshade; imagery already has the real sun and shade in
				// it, so it only takes a gentle share of the relief (and the dusk-to-night dimming)
				vec3 relief = clamp(sun / 0.9, 0.45, 1.05);
				vec3 kImg = mix(0.55, 1.0, uDay) * mix(vec3(1.0), relief, 0.4);
				vec3 land = mix(col * sun, img * kImg, uMapMix * have);
				col = mix(land, water * sun, wet);

				// elevation lines: fine every 20 m, stronger every 100 m, drawn like an engraving.
				// fwidth: how fast the height changes per pixel, so every line is about a pixel wide
				float k = vH / 20.0;
				float line = 1.0 - min(abs(fract(k - 0.5) - 0.5) / max(fwidth(k), 1e-4), 1.0);
				float m = vH / 100.0;
				float major = 1.0 - min(abs(fract(m - 0.5) - 0.5) / max(fwidth(m), 1e-4), 1.0);
				float ink = (line * 0.22 + major * 0.45) * uContours * (1.0 - max(w, sea));
				col = mix(col, vec3(0.30, 0.26, 0.22), ink);

				// a hairline where the land meets the rim
				col *= 1.0 - 0.25 * smoothstep(uR - 12.0, uR, d);
				gl_FragColor = vec4(col, uFade);
			}
		`
		});
		const SEG = 256;
		const wallPos = /* @__PURE__ */ new Float32Array(1542);
		const wallNorm = /* @__PURE__ */ new Float32Array(1542);
		const wallTop = /* @__PURE__ */ new Float32Array(514);
		const wallAng = /* @__PURE__ */ new Float32Array(514);
		const wallIndex = [];
		for (let k = 0; k < SEG; k++) {
			const a = k * 2;
			wallIndex.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
		}
		for (let k = 0; k <= SEG; k++) {
			const t = k / SEG * Math.PI * 2;
			for (const j of [0, 1]) {
				wallNorm.set([
					Math.cos(t),
					0,
					-Math.sin(t)
				], (k * 2 + j) * 3);
				wallAng[k * 2 + j] = t;
			}
			const h = gridHeight(R * Math.cos(t), R * Math.sin(t)) + 1.5;
			wallTop[k * 2] = wallTop[k * 2 + 1] = h;
		}
		const wall = new BufferGeometry();
		wall.setIndex(wallIndex);
		wall.setAttribute("position", new BufferAttribute(wallPos, 3));
		wall.setAttribute("normal", new BufferAttribute(wallNorm, 3));
		wall.setAttribute("aTop", new BufferAttribute(wallTop, 1));
		wall.setAttribute("aAng", new BufferAttribute(wallAng, 1));
		const wallMat = new ShaderMaterial({
			side: DoubleSide,
			uniforms: { ...lightUniforms() },
			vertexShader: `
			uniform float uExag;
			attribute float aTop;
			attribute float aAng;
			varying float vDepth;
			varying float vAng;
			varying vec3 vN;
			void main() {
				vDepth = (aTop - position.y) * uExag; // metres below the ground, as seen
				vAng = aAng;
				vN = normal;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
			fragmentShader: `
			${LIGHT_GLSL}
			varying float vDepth;
			varying float vAng;
			varying vec3 vN;
			void main() {
				// turf, topsoil, then gently wavy bands of clay and stone
				float wave = sin(vAng * 23.0) * 6.0 + sin(vAng * 7.0) * 10.0;
				float z = vDepth + wave;
				vec3 col = vec3(0.55, 0.68, 0.42);
				col = mix(col, vec3(0.55, 0.42, 0.32), smoothstep(6.0, 14.0, vDepth));
				float bands = 0.5 + 0.5 * sin(z * 0.045);
				vec3 clay = mix(vec3(0.78, 0.66, 0.52), vec3(0.70, 0.60, 0.50), bands);
				col = mix(col, clay, smoothstep(40.0, 70.0, vDepth));
				col = mix(col, vec3(0.84, 0.80, 0.74), smoothstep(0.62, 0.7, sin(z * 0.013)) * smoothstep(90.0, 140.0, vDepth));
				gl_FragColor = vec4(lit(col, normalize(vN)), uFade);
			}
		`
		});
		useTask((dt) => {
			globe.base += (globe.baseGoal - globe.base) * Math.min(1, dt * 1.5);
			for (let k = 0; k <= SEG; k++) {
				const t = k / SEG * Math.PI * 2;
				const px = R * Math.cos(t);
				const pn = R * Math.sin(t);
				wallPos.set([
					px,
					wallTop[k * 2],
					-pn,
					px,
					globe.base,
					-pn
				], k * 6);
			}
			wall.attributes.position.needsUpdate = true;
			wall.computeBoundingSphere();
			const f = fade?.() ?? 1;
			for (const u of [material.uniforms, wallMat.uniforms]) {
				u.uLightDir.value.copy(globe.lightDir);
				u.uLight.value.copy(globe.light);
				u.uStrength.value = globe.lightStrength;
				u.uDay.value = globe.daylight;
				u.uExag.value = puck.exaggeration;
				u.uFade.value = f;
			}
			material.transparent = wallMat.transparent = f < .999;
			const m = material.uniforms;
			m.uTime.value += dt;
			m.uWater.value = puck.layers.water ? 1 : 0;
			m.uContours.value = puck.layers.contours ? 1 : 0;
			m.uMapMix.value = imagery.mix;
			m.uPhoto.value = imagery.photo ? 1 : 0;
		});
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				geometry,
				material,
				frustumCulled: false
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				geometry: wall,
				material: wallMat,
				frustumCulled: false
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
// ../../packages/puck/src/lib/GlobeHalo.svelte
function GlobeHalo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { globe, radius, heights, contours, lines, open, fogIn = 1.2, fogOut = 2.6 } = $$props;
		const R = radius;
		const OUTER = R * fogOut;
		const N = Math.min(260, Math.round(160 * fogOut / 2.6));
		const CELL = OUTER * 2 / N;
		const ground = (x, n) => {
			const h = heights(x, n);
			return Number.isFinite(h) ? Math.max(0, h) : 0;
		};
		/** shared by every material out here: how visible a point is, by its distance from the centre */
		const fade = `
		uniform float uInner;
		uniform float uOuter;
		uniform float uClear;
		uniform float uFadeFrom;
		uniform float uBase;
		uniform float uDip;
		uniform float uOpen;
		float haloFade(vec2 xz, float h) {
			float d = length(xz);
			// a crisp inner edge where the surroundings begin (uClear), then a short fade-in over a
			// quarter of their depth, and the outer fog closing in from uFadeFrom to uOuter
			if (d < uClear) return 0.0;
			float f = smoothstep(uClear, uClear + (uOuter - uClear) * 0.25, d) * (1.0 - smoothstep(uFadeFrom, uOuter, d));
			// the aperture: open out from the inner edge to the full reach, a soft edge on the way
			float edge = mix(uClear, uOuter * 1.08, uOpen);
			f *= 1.0 - smoothstep(edge - (uOuter - uInner) * 0.12, edge, d);
			// ground below the globe's floor would sit in front of the plinth: let it go
			return f * smoothstep(uBase - uDip, uBase, h);
		}
	`;
		const uniforms = () => ({
			uInner: { value: R },
			uOuter: { value: OUTER },
			uClear: { value: R * 1.2 },
			uFadeFrom: { value: OUTER * .7 },
			uBase: { value: 0 },
			uDip: { value: R * .08 },
			uOpen: { value: 1 }
		});
		const S = N + 1;
		const positions = new Float32Array(S * S * 3);
		const index = [];
		for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
			const a = r * S + c;
			index.push(a, a + S, a + 1, a + 1, a + S, a + S + 1);
		}
		for (let r = 0; r < S; r++) for (let c = 0; c < S; c++) {
			const x = -OUTER + c * CELL;
			const n = OUTER - r * CELL;
			positions.set([
				x,
				ground(x, n),
				-n
			], (r * S + c) * 3);
		}
		const surface = new BufferGeometry();
		surface.setIndex(index);
		surface.setAttribute("position", new BufferAttribute(positions, 3));
		surface.computeBoundingSphere();
		const surfaceMat = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			side: DoubleSide,
			uniforms: uniforms(),
			vertexShader: `
			varying float vH;
			varying vec2 vXZ;
			void main() {
				vH = position.y;
				vXZ = position.xz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
			fragmentShader: `
			${fade}
			varying float vH;
			varying vec2 vXZ;
			void main() {
				float f = haloFade(vXZ, vH);
				if (f <= 0.001 || vH <= 0.5) discard; // nothing inside the globe; no lines on the sea
				float k = vH / 20.0;
				float fk = max(fwidth(k), 1e-4);
				float line = 1.0 - min(abs(fract(k - 0.5) - 0.5) / fk, 1.0);
				// where the 20 m lines crowd together on screen (steep ground), keep only the 100 m ones
				line *= 1.0 - smoothstep(0.25, 0.6, fk);
				float m = vH / 100.0;
				float major = 1.0 - min(abs(fract(m - 0.5) - 0.5) / max(fwidth(m), 1e-4), 1.0);
				float a = (line * 0.14 + major * 0.3) * f;
				if (a < 0.01) discard;
				gl_FragColor = vec4(0.36, 0.46, 0.56, a);
			}
		`
		});
		const lineGeo = new BufferGeometry();
		const lineMat = new ShaderMaterial({
			transparent: true,
			depthWrite: false,
			uniforms: {
				...uniforms(),
				uDash: { value: R * .03 }
			},
			vertexShader: `
			attribute vec4 aLook;
			attribute float aDash;
			attribute float aDist;
			varying vec4 vLook;
			varying float vDashed;
			varying float vDist;
			varying vec2 vXZ;
			varying float vH;
			void main() {
				vLook = aLook;
				vDashed = aDash;
				vDist = aDist;
				vXZ = position.xz;
				vH = position.y;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
			fragmentShader: `
			${fade}
			uniform float uDash;
			varying vec4 vLook;
			varying float vDashed;
			varying float vDist;
			varying vec2 vXZ;
			varying float vH;
			void main() {
				float f = haloFade(vXZ, vH);
				if (f <= 0.001) discard;
				if (vDashed > 0.5 && fract(vDist / uDash) > 0.55) discard;
				gl_FragColor = vec4(vLook.rgb, vLook.a * f);
			}
		`
		});
		let builtLines;
		/** Segments with both ends within reach, on the ground. */
		function buildLines() {
			const lp = [];
			const look = [];
			const dash = [];
			const dist = [];
			const reach = OUTER * 1.05;
			for (const line of lines) {
				const p = line.xy;
				const l = [...line.haloColor, line.haloAlpha];
				const d = line.dash ? 1 : 0;
				let along = 0;
				for (let k = 2; k < p.length; k += 2) {
					const seg = Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
					if (Math.hypot(p[k], p[k + 1]) < reach && Math.hypot(p[k - 2], p[k - 1]) < reach) {
						lp.push(p[k - 2], ground(p[k - 2], p[k - 1]) + 2, -p[k - 1], p[k], ground(p[k], p[k + 1]) + 2, -p[k + 1]);
						look.push(...l, ...l);
						dash.push(d, d);
						dist.push(along, along + seg);
					}
					along += seg;
				}
			}
			lineGeo.setAttribute("position", new BufferAttribute(new Float32Array(lp), 3));
			lineGeo.setAttribute("aLook", new BufferAttribute(new Float32Array(look), 4));
			lineGeo.setAttribute("aDash", new BufferAttribute(new Float32Array(dash), 1));
			lineGeo.setAttribute("aDist", new BufferAttribute(new Float32Array(dist), 1));
			lineGeo.computeBoundingSphere();
		}
		useTask(() => {
			if (lines !== builtLines) {
				builtLines = lines;
				buildLines();
			}
			for (const m of [surfaceMat, lineMat]) {
				m.uniforms.uBase.value = globe.base;
				m.uniforms.uOpen.value = open?.() ?? 1;
				m.uniforms.uClear.value = R * fogIn;
				m.uniforms.uFadeFrom.value = Math.max(R * fogIn + (OUTER - R * fogIn) * .25, OUTER * .7);
			}
		});
		if (contours) {
			$$renderer.push("<!--[0-->");
			if (T$1.Mesh) {
				$$renderer.push("<!--[-->");
				T$1.Mesh($$renderer, {
					geometry: surface,
					material: surfaceMat,
					frustumCulled: false,
					renderOrder: 1
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		if (lines.length) {
			$$renderer.push("<!--[0-->");
			if (T$1.LineSegments) {
				$$renderer.push("<!--[-->");
				T$1.LineSegments($$renderer, {
					geometry: lineGeo,
					material: lineMat,
					frustumCulled: false,
					renderOrder: 1
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]-->`);
	});
}
// ../../packages/puck/src/lib/GlobeLabels.svelte
function GlobeLabels($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { globe, radius, places, exaggeration } = $$props;
		/** at most this many names at once (fewer on a phone) */
		const MAX = (globalThis.innerWidth ?? 1e3) < 600 ? 8 : 14;
		const rank = (p) => ({
			town: 5e3,
			water: 4e3,
			village: 3e3,
			peak: 1e3 + (p.ele ?? 0),
			hamlet: 500,
			locality: 0
		})[p.kind];
		const shown = derived(() => {
			const kinds = /* @__PURE__ */ new Set([
				"town",
				"village",
				"hamlet",
				"peak",
				"water",
				...radius <= 2500 ? ["locality"] : []
			]);
			const lim = radius * .92;
			const gap = radius * .16 * Math.max(1, 900 / (globalThis.innerWidth ?? 900));
			const chosen = [];
			for (const p of places.filter((p) => kinds.has(p.kind) && Math.hypot(p.x, p.n) < lim).sort((a, b) => rank(b) - rank(a))) {
				if (chosen.length >= MAX) break;
				if (chosen.every((c) => Math.abs(c.n - p.n) > gap * .45 || Math.abs(c.x - p.x) > gap * 1.6)) chosen.push(p);
			}
			return chosen.map((p) => ({
				key: `${p.kind}${p.name}${Math.round(p.x)}`,
				p,
				h: globe.ground(p.x, p.n)
			}));
		});
		const lift = derived(() => radius * .012);
		$$renderer.push(`<!--[-->`);
		const each_array = ensure_array_like(shown());
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let l = each_array[$$index];
			HTML($$renderer, {
				position: [
					l.p.x,
					l.h * exaggeration + lift(),
					-l.p.n
				],
				center: true,
				pointerEvents: "none",
				zIndexRange: [30, 0],
				children: ($$renderer) => {
					$$renderer.push(`<span${attr_class(`gl ${stringify(l.p.kind)}`, "svelte-1y87kw6")} aria-hidden="true">`);
					if (l.p.kind === "peak") $$renderer.push(`<!--[0--><span class="tri svelte-1y87kw6">▲</span>`);
					else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->${escape_html(l.p.name)}`);
					if (l.p.kind === "peak" && l.p.ele) $$renderer.push(`<!--[0--><small class="svelte-1y87kw6"> ${escape_html(l.p.ele)} m</small>`);
					else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--></span>`);
				},
				$$slots: { default: true }
			});
		}
		$$renderer.push(`<!--]-->`);
	});
}
// ../../packages/puck/src/lib/GlobeLines.svelte
function GlobeLines($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { globe, radius, lines, fade } = $$props;
		const LIFT = Math.max(1.5, radius / 1200);
		const geometry = new BufferGeometry();
		let built = -1;
		let builtLines;
		/** Each line as a ribbon: two vertices per point, pushed out either side of the line. */
		function build() {
			const reach = globe.patch.reach;
			const pos = [];
			const col = [];
			const dist = [];
			const dash = [];
			const idx = [];
			const inside = (x, n) => Math.hypot(x, n) < reach;
			for (const line of lines) {
				const half = radius * line.half;
				const p = line.xy;
				const look = [...line.color, line.alpha];
				const dashed = line.dash ? 1 : 0;
				let run = [];
				const flush = () => {
					if (run.length > 1) {
						const start = pos.length / 3;
						let along = 0;
						run.forEach(([x, n], k) => {
							const [ax, an] = run[Math.max(0, k - 1)];
							const [bx, bn] = run[Math.min(run.length - 1, k + 1)];
							if (k) along += Math.hypot(x - run[k - 1][0], n - run[k - 1][1]);
							let dx = bx - ax;
							let dn = bn - an;
							const len = Math.hypot(dx, dn) || 1;
							dx /= len;
							dn /= len;
							const h = globe.ground(x, n) + LIFT;
							pos.push(x - dn * half, h, -(n + dx * half), x + dn * half, h, -(n - dx * half));
							col.push(...look, ...look);
							dash.push(dashed, dashed);
							dist.push(along, along);
							if (k > 0) {
								const q = start + (k - 1) * 2;
								idx.push(q, q + 1, q + 2, q + 2, q + 1, q + 3);
							}
						});
					}
					run = [];
				};
				for (let k = 0; k < p.length; k += 2) if (inside(p[k], p[k + 1])) run.push([p[k], p[k + 1]]);
				else flush();
				flush();
			}
			geometry.setAttribute("position", new BufferAttribute(new Float32Array(pos), 3));
			geometry.setAttribute("aLook", new BufferAttribute(new Float32Array(col), 4));
			geometry.setAttribute("aDash", new BufferAttribute(new Float32Array(dash), 1));
			geometry.setAttribute("aDist", new BufferAttribute(new Float32Array(dist), 1));
			geometry.setIndex(idx);
			geometry.computeBoundingSphere();
		}
		const material = new ShaderMaterial({
			side: DoubleSide,
			transparent: true,
			depthWrite: false,
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: -2,
			uniforms: {
				uR: { value: radius },
				uDash: { value: radius * .02 },
				uFade: { value: 1 }
			},
			vertexShader: `
			attribute float aDist;
			attribute vec4 aLook;
			attribute float aDash;
			varying vec4 vLook;
			varying float vDashed;
			varying float vDist;
			varying vec2 vXZ;
			void main() {
				vLook = aLook;
				vDashed = aDash;
				vDist = aDist;
				vXZ = position.xz;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
			fragmentShader: `
			uniform float uFade;
			uniform float uR;
			uniform float uDash;
			varying vec4 vLook;
			varying float vDashed;
			varying float vDist;
			varying vec2 vXZ;
			void main() {
				if (length(vXZ) > uR - 2.0) discard;
				if (vDashed > 0.5 && fract(vDist / uDash) > 0.55) discard;
				gl_FragColor = vec4(vLook.rgb, vLook.a * uFade);
			}
		`
		});
		useTask(() => {
			material.uniforms.uFade.value = fade?.() ?? 1;
			if (globe.version !== built || lines !== builtLines) {
				built = globe.version;
				builtLines = lines;
				build();
			}
		});
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				geometry,
				material,
				frustumCulled: false,
				renderOrder: 2
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
// ../../packages/puck/src/lib/Marker.svelte
function Marker($$renderer, $$props) {
	let { radius, ground, exaggeration } = $$props;
	const s = derived(() => radius / 1800);
	if (T$1.Group) {
		$$renderer.push("<!--[-->");
		T$1.Group($$renderer, {
			position: [
				0,
				ground * exaggeration,
				0
			],
			scale: [
				s(),
				s(),
				s()
			],
			children: ($$renderer) => {
				if (T$1.Mesh) {
					$$renderer.push("<!--[-->");
					T$1.Mesh($$renderer, {
						"position.y": 45,
						children: ($$renderer) => {
							if (T$1.CylinderGeometry) {
								$$renderer.push("<!--[-->");
								T$1.CylinderGeometry($$renderer, { args: [
									2.2,
									.6,
									90,
									12
								] });
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
							$$renderer.push(` `);
							if (T$1.MeshStandardMaterial) {
								$$renderer.push("<!--[-->");
								T$1.MeshStandardMaterial($$renderer, {
									color: "#5b4a3c",
									roughness: .6
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						},
						$$slots: { default: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
				$$renderer.push(` `);
				if (T$1.Mesh) {
					$$renderer.push("<!--[-->");
					T$1.Mesh($$renderer, {
						"position.y": 96,
						children: ($$renderer) => {
							if (T$1.SphereGeometry) {
								$$renderer.push("<!--[-->");
								T$1.SphereGeometry($$renderer, { args: [
									16,
									24,
									16
								] });
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
							$$renderer.push(` `);
							if (T$1.MeshStandardMaterial) {
								$$renderer.push("<!--[-->");
								T$1.MeshStandardMaterial($$renderer, {
									color: "#c2562d",
									roughness: .45,
									emissive: "#c2562d",
									emissiveIntensity: .25
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						},
						$$slots: { default: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
				$$renderer.push(` `);
				if (T$1.Mesh) {
					$$renderer.push("<!--[-->");
					T$1.Mesh($$renderer, {
						"position.y": .5,
						"rotation.x": -Math.PI / 2,
						children: ($$renderer) => {
							if (T$1.RingGeometry) {
								$$renderer.push("<!--[-->");
								T$1.RingGeometry($$renderer, { args: [
									6,
									12,
									32
								] });
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
							$$renderer.push(` `);
							if (T$1.MeshBasicMaterial) {
								$$renderer.push("<!--[-->");
								T$1.MeshBasicMaterial($$renderer, {
									color: "#c2562d",
									transparent: true,
									opacity: .6,
									depthWrite: false
								});
								$$renderer.push("<!--]-->");
							} else {
								$$renderer.push("<!--[!-->");
								$$renderer.push("<!--]-->");
							}
						},
						$$slots: { default: true }
					});
					$$renderer.push("<!--]-->");
				} else {
					$$renderer.push("<!--[!-->");
					$$renderer.push("<!--]-->");
				}
			},
			$$slots: { default: true }
		});
		$$renderer.push("<!--]-->");
	} else {
		$$renderer.push("<!--[!-->");
		$$renderer.push("<!--]-->");
	}
}
// ../../packages/puck/src/lib/lines.ts
var ROAD_HALF = [
	.0034,
	.0028,
	.0022,
	.0016,
	.0011
];
var ROAD_ALPHA = [
	.95,
	.9,
	.8,
	.6,
	.4
];
var ROAD_HALO = [
	.6,
	.5,
	.38,
	.25,
	.14
];
function globeLines(map, show) {
	const lines = [];
	if (show.parks) for (const park of map.parks.filter((p) => p.national)) for (const xy of park.edges) lines.push({
		xy,
		half: .0013,
		color: [
			.17,
			.55,
			.27
		],
		alpha: .75,
		haloColor: [
			.17,
			.55,
			.27
		],
		haloAlpha: .35,
		dash: true
	});
	if (show.rivers) for (const xy of map.rivers) lines.push({
		xy,
		half: .0017,
		color: [
			.42,
			.66,
			.86
		],
		alpha: .9,
		haloColor: [
			.42,
			.62,
			.8
		],
		haloAlpha: .35,
		dash: false
	});
	if (show.roads) for (const road of [...map.roads].sort((a, b) => b.tier - a.tier)) {
		const t = road.tier;
		lines.push({
			xy: road.xy,
			half: ROAD_HALF[t],
			color: [
				1,
				.99,
				.96
			],
			alpha: ROAD_ALPHA[t],
			haloColor: [
				.47,
				.49,
				.52
			],
			haloAlpha: ROAD_HALO[t],
			dash: false
		});
	}
	return lines;
}
// ../../packages/puck/src/lib/GlobeScene.svelte
var carried = {
	sun: null,
	moon: null
};
function GlobeScene($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { puck, data, imagery, layers, onsky, onshadow, rise } = $$props;
		/** the globe's size on screen (scene units): fixed; the landscape is scaled to fit it */
		const V = 1800;
		const R = data.radius;
		const RAD = Math.PI / 180;
		const globe = new GlobeState(V);
		const plane = localPlane(data.spot);
		const lines = derived(() => globeLines(data.map, {
			roads: puck.layers.roads,
			rivers: puck.layers.water,
			parks: puck.layers.parks
		}));
		const land = new Group();
		let exag = 2;
		/** labels stand at full height: they wait until the land has risen */
		let settled = false;
		const shown = () => {
			const u = Math.min(1, rise() / .18);
			return u * u * (3 - 2 * u);
		};
		let haloLift = 0;
		let sink = 0;
		let centreHeight = 0;
		const ORBIT = V * 1.55;
		const glow = (() => {
			const c = document.createElement("canvas");
			c.width = c.height = 128;
			const ctx = c.getContext("2d");
			const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
			g.addColorStop(0, "rgba(255, 244, 214, 1)");
			g.addColorStop(.25, "rgba(255, 214, 140, 0.9)");
			g.addColorStop(1, "rgba(255, 200, 120, 0)");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, 128, 128);
			return new CanvasTexture(c);
		})();
		const moonGeo = new SphereGeometry(V * .05, 32, 16);
		const moonMat = new ShaderMaterial({
			uniforms: { uSun: { value: new Vector3(0, 1, 0) } },
			vertexShader: `
			varying vec3 vN;
			void main() {
				vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
			fragmentShader: `
			uniform vec3 uSun;
			varying vec3 vN;
			void main() {
				float lit = smoothstep(-0.05, 0.15, dot(normalize(vN), uSun));
				gl_FragColor = vec4(mix(vec3(0.42, 0.46, 0.58), vec3(0.98, 0.96, 0.90), lit), 1.0);
			}
		`
		});
		const sunBody = new Sprite(new SpriteMaterial({
			map: glow,
			depthWrite: false,
			transparent: true
		}));
		sunBody.scale.setScalar(V * .32);
		const moonBody = new Mesh(moonGeo, moonMat);
		let shadow = .5;
		const goal = {
			colour: new Color(),
			strength: 1,
			dir: new Vector3(0, 1, 0),
			daylight: 1,
			hemi: 1,
			hemiColour: new Color()
		};
		const night = new Vector3(.2, 1, .3).normalize();
		const sunGoal = new Vector3();
		const moonGoal = new Vector3();
		let sunNow = null;
		let moonNow = null;
		let sunLight = void 0;
		let hemi = void 0;
		let sky = "";
		useTask((dt) => {
			puck.advance(Math.min(dt, .1));
			const r = rise();
			exag = puck.exaggeration * r;
			if (settled !== r > .999) settled = r > .999;
			haloLift = Number.isFinite(globe.base) ? globe.base * (exag - puck.exaggeration) : 0;
			sink = -(1 - shown()) * V * .03 * (R / V);
			const k = V / R;
			land.scale.setScalar(k);
			if (Number.isFinite(globe.base)) land.position.set(0, -globe.base * exag * k, 0);
			centreHeight = globe.ground(0, 0);
			const w = weatherAt(data.weather, puck.time);
			globe.weather = w;
			const drizzle = w && w.code >= 51 && w.code <= 57 ? .25 : 0;
			globe.rain = puck.layers.weather && w ? Math.min(1, Math.max(drizzle, w.precip / 1.5)) : 0;
			const { lon, lat } = data.spot;
			const sun = sunAt(puck.time, lat, lon);
			const moon = moonAt(puck.time, lat, lon);
			sunGoal.set(...direction$1(sun));
			moonGoal.set(...direction$1(moon));
			if (!sunNow) sunNow = (carried.sun ?? sunGoal).clone();
			if (!moonNow) moonNow = (carried.moon ?? moonGoal).clone();
			const glide = (now, goal) => {
				const far = now.angleTo(goal);
				now.lerp(goal, Math.min(1, dt * (far > .05 ? 2.2 : 12))).normalize();
			};
			glide(sunNow, sunGoal);
			glide(moonNow, moonGoal);
			carried.sun = sunNow.clone();
			carried.moon = moonNow.clone();
			globe.sunDir.copy(sunNow);
			globe.moonDir.copy(moonNow);
			sunBody.position.copy(globe.sunDir).multiplyScalar(ORBIT);
			moonBody.position.copy(globe.moonDir).multiplyScalar(ORBIT);
			const here = Math.min(1, r * 1.5);
			sunBody.visible = globe.sunDir.y > Math.sin(-2 * RAD) && here > .01;
			sunBody.material.opacity = here;
			moonBody.visible = globe.moonDir.y > Math.sin(-2 * RAD) && sun.alt < 12 * RAD && here > .01;
			moonBody.scale.setScalar(Math.max(.001, here));
			moonMat.uniforms.uSun.value.copy(globe.sunDir);
			const deg = sun.alt / RAD;
			const daylight = Math.min(1, Math.max(0, (deg + 8) / 16));
			const colours = skyColours(sun.alt, puck.layers.weather && w ? w.cloud / 100 : 0, globe.rain);
			goal.colour.set(colours.light);
			if (deg > -3) {
				goal.dir.copy(globe.sunDir);
				if (goal.dir.y < .08) goal.dir.setY(.08).normalize();
				goal.strength = .25 + .75 * Math.min(1, Math.max(0, (deg + 3) / 20));
			} else {
				goal.dir.copy(moon.alt > 0 ? globe.moonDir : night);
				goal.strength = moon.alt > 0 ? .3 : .12;
			}
			if (puck.layers.weather && w) goal.strength *= 1 - .45 * (w.cloud / 100);
			goal.daylight = daylight;
			goal.hemi = .55 + .6 * daylight;
			goal.hemiColour.set(colours.top);
			const now = easeLight(goal, dt);
			globe.daylight = now.daylight;
			globe.light.copy(now.colour);
			globe.lightDir.copy(now.dir);
			globe.lightStrength = now.strength;
			if (sunLight) {
				sunLight.position.copy(now.dir).multiplyScalar(V * 3);
				sunLight.color.copy(now.colour);
				sunLight.intensity = now.strength * 1.6;
			}
			if (hemi) {
				hemi.intensity = now.hemi;
				hemi.color.copy(now.hemiColour);
			}
			const s = Math.round((.2 + .35 * now.daylight) * 20) / 20;
			if (s !== shadow) {
				shadow = s;
				onshadow(s);
			}
			const next = colours.top + colours.bottom;
			if (next !== sky) {
				sky = next;
				onsky(colours.top, colours.bottom);
			}
		});
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (T$1.HemisphereLight) {
				$$renderer.push("<!--[-->");
				T$1.HemisphereLight($$renderer, {
					args: [
						"#dfeef7",
						"#d8cbb4",
						1.2
					],
					get ref() {
						return hemi;
					},
					set ref($$value) {
						hemi = $$value;
						$$settled = false;
					}
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			if (T$1.DirectionalLight) {
				$$renderer.push("<!--[-->");
				T$1.DirectionalLight($$renderer, {
					position: [
						V,
						V * 2,
						V
					],
					intensity: 2,
					get ref() {
						return sunLight;
					},
					set ref($$value) {
						sunLight = $$value;
						$$settled = false;
					}
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			T$1($$renderer, {
				is: land,
				children: ($$renderer) => {
					if (T$1.Group) {
						$$renderer.push("<!--[-->");
						T$1.Group($$renderer, {
							"scale.y": exag,
							"position.y": sink,
							children: ($$renderer) => {
								DioramaTerrain($$renderer, {
									puck,
									data,
									globe,
									imagery,
									fade: shown
								});
								$$renderer.push(`<!----> `);
								if (lines().length) {
									$$renderer.push("<!--[0-->");
									GlobeLines($$renderer, {
										globe,
										radius: R,
										lines: lines(),
										fade: shown
									});
								} else $$renderer.push("<!--[-1-->");
								$$renderer.push(`<!--]-->`);
							},
							$$slots: { default: true }
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (puck.halo) {
						$$renderer.push("<!--[0-->");
						if (T$1.Group) {
							$$renderer.push("<!--[-->");
							T$1.Group($$renderer, {
								"scale.y": puck.exaggeration,
								"position.y": haloLift,
								children: ($$renderer) => {
									GlobeHalo($$renderer, {
										globe,
										radius: R,
										heights: data.far,
										contours: puck.layers.contours,
										lines: lines(),
										open: rise,
										fogIn: puck.fogIn,
										fogOut: data.fogOut
									});
								},
								$$slots: { default: true }
							});
							$$renderer.push("<!--]-->");
						} else {
							$$renderer.push("<!--[!-->");
							$$renderer.push("<!--]-->");
						}
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (settled) {
						$$renderer.push("<!--[0-->");
						if (puck.layers.labels) {
							$$renderer.push("<!--[0-->");
							GlobeLabels($$renderer, {
								globe,
								radius: R,
								places: data.map.places,
								exaggeration: puck.exaggeration
							});
						} else $$renderer.push("<!--[-1-->");
						$$renderer.push(`<!--]-->`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (puck.layers.marker) {
						$$renderer.push("<!--[0-->");
						Marker($$renderer, {
							radius: R,
							ground: centreHeight,
							exaggeration: exag
						});
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]--> `);
					if (layers) {
						$$renderer.push("<!--[0-->");
						layers($$renderer, {
							globe,
							plane,
							spot: data.spot,
							radius: R,
							exaggeration: exag,
							settled,
							rise
						});
						$$renderer.push(`<!---->`);
					} else $$renderer.push("<!--[-1-->");
					$$renderer.push(`<!--]-->`);
				},
				$$slots: { default: true }
			});
			$$renderer.push(`<!----> `);
			GlobeWeather($$renderer, {
				globe,
				show: puck.layers.weather,
				presence: rise
			});
			$$renderer.push(`<!----> `);
			T$1($$renderer, { is: sunBody });
			$$renderer.push(`<!----> `);
			T$1($$renderer, { is: moonBody });
			$$renderer.push(`<!---->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
// ../../packages/puck/src/lib/Plinth.svelte
function Plinth($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { R, title, date, shadow, lettering } = $$props;
		const OUT = R * 1.13;
		const H = R * .1;
		const CREAM = "#f1ebe0";
		const INK = "rgba(92, 76, 60, 0.85)";
		const LIGHT = "rgba(255, 255, 255, 0.7)";
		const FONT = "\"Iowan Old Style\", \"Palatino Linotype\", Palatino, Georgia, serif";
		/** Text cut into the surface: a dark stroke with a light edge below it. */
		function engrave(ctx, text, x, y) {
			ctx.fillStyle = LIGHT;
			ctx.fillText(text, x, y + 2);
			ctx.fillStyle = INK;
			ctx.fillText(text, x, y);
		}
		function compass() {
			const S = 2048;
			const c = document.createElement("canvas");
			c.width = c.height = S;
			const ctx = c.getContext("2d");
			const mid = S / 2;
			const k = mid / OUT;
			const inner = R * k;
			ctx.fillStyle = CREAM;
			ctx.beginPath();
			ctx.arc(mid, mid, mid, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = INK;
			ctx.lineCap = "round";
			for (let deg = 0; deg < 360; deg += 5) {
				const a = deg * Math.PI / 180;
				const len = deg % 45 === 0 ? 34 : deg % 15 === 0 ? 20 : 11;
				ctx.lineWidth = deg % 45 === 0 ? 4 : 2;
				const r1 = 1016;
				const [sx, sy] = [Math.sin(a), -Math.cos(a)];
				ctx.beginPath();
				ctx.moveTo(mid + sx * r1, mid + sy * r1);
				ctx.lineTo(mid + sx * (r1 - len), mid + sy * (r1 - len));
				ctx.stroke();
			}
			ctx.lineWidth = 2;
			for (const r of [inner + 6, inner + 12]) {
				ctx.beginPath();
				ctx.arc(mid, mid, r, 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			const rText = (inner + mid - 40) / 2 + 6;
			for (const [label, deg, size] of [
				[
					"N",
					0,
					64
				],
				[
					"NE",
					45,
					34
				],
				[
					"E",
					90,
					56
				],
				[
					"SE",
					135,
					34
				],
				[
					"S",
					180,
					56
				],
				[
					"SW",
					225,
					34
				],
				[
					"W",
					270,
					56
				],
				[
					"NW",
					315,
					34
				]
			]) {
				const a = deg * Math.PI / 180;
				ctx.save();
				ctx.translate(mid + Math.sin(a) * rText, mid - Math.cos(a) * rText);
				ctx.rotate(a);
				ctx.font = `${deg % 90 === 0 ? 700 : 500} ${size}px ${FONT}`;
				engrave(ctx, label, 0, 0);
				ctx.restore();
			}
			const t = new CanvasTexture(c);
			t.colorSpace = SRGBColorSpace;
			t.anisotropy = 8;
			return t;
		}
		/** the side: cream with a thin moulding at top and bottom (the lettering is a layer over it) */
		function side() {
			const W = 1024;
			const Hpx = 256;
			const c = document.createElement("canvas");
			c.width = W;
			c.height = Hpx;
			const ctx = c.getContext("2d");
			ctx.fillStyle = CREAM;
			ctx.fillRect(0, 0, W, Hpx);
			ctx.fillStyle = "rgba(92, 76, 60, 0.25)";
			ctx.fillRect(0, 14, W, 3);
			ctx.fillRect(0, 239, W, 3);
			const t = new CanvasTexture(c);
			t.colorSpace = SRGBColorSpace;
			return t;
		}
		/** the lettering alone, on transparent, so it can fade */
		function band(label) {
			const W = 4096;
			const Hpx = 256;
			const c = document.createElement("canvas");
			c.width = W;
			c.height = Hpx;
			const ctx = c.getContext("2d");
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.font = `600 64px ${FONT}`;
			engrave(ctx, label, W / 2, Hpx / 2);
			const t = new CanvasTexture(c);
			t.colorSpace = SRGBColorSpace;
			t.anisotropy = 8;
			return t;
		}
		function shadowTex() {
			const c = document.createElement("canvas");
			c.width = c.height = 256;
			const ctx = c.getContext("2d");
			const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 128);
			g.addColorStop(0, "rgba(40, 45, 60, 0.55)");
			g.addColorStop(1, "rgba(40, 45, 60, 0)");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, 256, 256);
			return new CanvasTexture(c);
		}
		/** the plinth's floor under the land: its own stone, a little shaded towards the rim like a shallow tray */
		function floorTex() {
			const S = 512;
			const c = document.createElement("canvas");
			c.width = c.height = S;
			const ctx = c.getContext("2d");
			const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
			g.addColorStop(0, "#ece5d8");
			g.addColorStop(.75, "#e6dfd1");
			g.addColorStop(1, "#d3cabb");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, S, S);
			const t = new CanvasTexture(c);
			t.colorSpace = SRGBColorSpace;
			return t;
		}
		const ringTex = compass();
		const floor = floorTex();
		const sideTex = side();
		const letters = new MeshStandardMaterial({
			transparent: true,
			roughness: .85,
			emissive: "#ffffff",
			emissiveIntensity: .35,
			depthWrite: false
		});
		useTask(() => {
			letters.opacity = Math.min(1, Math.max(0, lettering?.() ?? 1));
		});
		const shadeTex = shadowTex();
		const label = derived(() => `${title.toUpperCase()}   ·   ${date.toUpperCase()}`);
		derived(() => band(label()));
		const body = new CylinderGeometry(OUT, OUT * 1.03, H, 160, 1, true, Math.PI);
		const cap = new RingGeometry(R * .98, OUT, 160);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				geometry: body,
				"position.y": -H / 2,
				children: ($$renderer) => {
					if (T$1.MeshStandardMaterial) {
						$$renderer.push("<!--[-->");
						T$1.MeshStandardMaterial($$renderer, {
							map: sideTex,
							emissiveMap: sideTex,
							emissive: "#ffffff",
							emissiveIntensity: .35,
							roughness: .85
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				geometry: body,
				"position.y": -H / 2,
				scale: [
					1.002,
					1,
					1.002
				],
				material: letters,
				renderOrder: 1
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				geometry: cap,
				"rotation.x": -Math.PI / 2,
				"position.y": .5,
				children: ($$renderer) => {
					if (T$1.MeshStandardMaterial) {
						$$renderer.push("<!--[-->");
						T$1.MeshStandardMaterial($$renderer, {
							map: ringTex,
							emissiveMap: ringTex,
							emissive: "#ffffff",
							emissiveIntensity: .35,
							roughness: .8
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				"rotation.x": -Math.PI / 2,
				"position.y": -R * .012,
				children: ($$renderer) => {
					if (T$1.CircleGeometry) {
						$$renderer.push("<!--[-->");
						T$1.CircleGeometry($$renderer, { args: [R * .99, 160] });
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (T$1.MeshStandardMaterial) {
						$$renderer.push("<!--[-->");
						T$1.MeshStandardMaterial($$renderer, {
							map: floor,
							emissiveMap: floor,
							emissive: "#ffffff",
							emissiveIntensity: .5,
							roughness: .8
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				"rotation.x": Math.PI / 2,
				"position.y": -H,
				children: ($$renderer) => {
					if (T$1.CircleGeometry) {
						$$renderer.push("<!--[-->");
						T$1.CircleGeometry($$renderer, { args: [OUT * 1.03, 96] });
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (T$1.MeshStandardMaterial) {
						$$renderer.push("<!--[-->");
						T$1.MeshStandardMaterial($$renderer, { color: "#d9d1c3" });
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
		$$renderer.push(` `);
		if (T$1.Mesh) {
			$$renderer.push("<!--[-->");
			T$1.Mesh($$renderer, {
				"rotation.x": -Math.PI / 2,
				"position.y": -H - R * .05,
				children: ($$renderer) => {
					if (T$1.PlaneGeometry) {
						$$renderer.push("<!--[-->");
						T$1.PlaneGeometry($$renderer, { args: [OUT * 3.2, OUT * 3.2] });
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
					$$renderer.push(` `);
					if (T$1.MeshBasicMaterial) {
						$$renderer.push("<!--[-->");
						T$1.MeshBasicMaterial($$renderer, {
							map: shadeTex,
							transparent: true,
							opacity: shadow,
							depthWrite: false
						});
						$$renderer.push("<!--]-->");
					} else {
						$$renderer.push("<!--[!-->");
						$$renderer.push("<!--]-->");
					}
				},
				$$slots: { default: true }
			});
			$$renderer.push("<!--]-->");
		} else {
			$$renderer.push("<!--[!-->");
			$$renderer.push("<!--]-->");
		}
	});
}
// ../../packages/puck/src/lib/GlobeStage.svelte
function GlobeStage($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { puck, imagery, layers, lettering, onshown, onsky } = $$props;
		const V = 1800;
		let width = globalThis.innerWidth ?? 1;
		let height = globalThis.innerHeight ?? 1;
		const fit = Math.max(1, 1.25 / Math.max(.3, width / height));
		let camera = void 0;
		let shown = puck.loaded;
		let shadow = .5;
		let shadowGoal = .5;
		const still = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
		let rise = 1;
		const risen = () => rise;
		let phase = "idle";
		let t = 0;
		let from = 1;
		const FALL = .7;
		const RISE = 1.4;
		const easeInOut = (u) => u < .5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
		const clamp = (u) => Math.min(1, Math.max(0, u));
		function swap() {
			shown = puck.loaded;
			shadowGoal = .5;
			onshown(shown);
		}
		useTask((dt) => {
			const target = puck.loaded;
			const waiting = puck.pending;
			if (phase !== "idle" || waiting) busy(1500);
			const eased = shadow + (shadowGoal - shadow) * Math.min(1, dt * 2);
			if (Math.abs(eased - shadow) > .004) shadow = eased;
			if (still) {
				if (target !== shown && !waiting) swap();
				rise = 1;
				return;
			}
			if (phase === "idle") {
				if (target !== shown && !waiting) {
					phase = "fall";
					t = 0;
					from = rise;
				} else rise += ((waiting ? .35 : 1) - rise) * Math.min(1, dt * 4);
			} else if (phase === "fall") {
				t += dt;
				rise = from * (1 - easeInOut(clamp(t / FALL)));
				if (t >= FALL) {
					swap();
					phase = "rise";
					t = 0;
					rise = 0;
				}
			} else {
				t += dt;
				rise = easeInOut(clamp(t / RISE));
				if (t >= RISE) phase = "idle";
			}
		});
		const plinth = derived(() => lettering ? lettering : shown ? {
			title: shown.spot.name,
			date: formatLonLat(shown.spot, 3)
		} : {
			title: "Geo Puck",
			date: "Anywhere on Earth"
		});
		let $$settled = true;
		let $$inner_renderer;
		function $$render_inner($$renderer) {
			if (T$1.PerspectiveCamera) {
				$$renderer.push("<!--[-->");
				T$1.PerspectiveCamera($$renderer, {
					makeDefault: true,
					position: [
						0,
						V * 2.1 * fit,
						V * 3.9 * fit
					],
					fov: 34,
					near: V * .01,
					far: V * 40,
					get ref() {
						return camera;
					},
					set ref($$value) {
						camera = $$value;
						$$settled = false;
					},
					children: ($$renderer) => {
						OrbitControls_1($$renderer, {
							target: [
								0,
								V * .04,
								0
							],
							enablePan: false,
							enableDamping: true,
							minDistance: V * 1.3,
							maxDistance: V * 6 * fit,
							maxPolarAngle: Math.PI * .47
						});
					},
					$$slots: { default: true }
				});
				$$renderer.push("<!--]-->");
			} else {
				$$renderer.push("<!--[!-->");
				$$renderer.push("<!--]-->");
			}
			$$renderer.push(` `);
			Plinth($$renderer, {
				R: V,
				title: plinth().title,
				date: plinth().date,
				shadow,
				lettering: () => phase === "idle" ? 1 : rise
			});
			$$renderer.push(`<!----> `);
			const each_array = ensure_array_like(shown ? [shown] : []);
			if (each_array.length !== 0) {
				$$renderer.push("<!--[-->");
				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let data = each_array[$$index];
					GlobeScene($$renderer, {
						puck,
						data,
						imagery,
						layers,
						onsky,
						rise: risen,
						onshadow: (s) => shadowGoal = s
					});
				}
			} else {
				$$renderer.push("<!--[!-->");
				GlobeOverview($$renderer, { rise: risen });
			}
			$$renderer.push(`<!--]-->`);
		}
		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);
		$$renderer.subsume($$inner_renderer);
	});
}
// ../../packages/puck/src/lib/Globe.svelte
function Globe($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { puck, layers, lettering } = $$props;
		const imagery = new Imagery();
		const DAY_SKY = {
			top: "#bfe1f7",
			bottom: "#f3f8fb"
		};
		let top = DAY_SKY.top;
		let bottom = DAY_SKY.bottom;
		const dpr = Math.min(2, globalThis.devicePixelRatio ?? 1);
		$$renderer.push(`<div class="globe svelte-189lhir"${attr_style("", {
			"--top": top,
			"--bottom": bottom
		})}>`);
		Canvas($$renderer, {
			dpr,
			toneMapping: NoToneMapping,
			createRenderer: (canvas) => new WebGLRenderer({
				canvas,
				alpha: true,
				antialias: true
			}),
			children: ($$renderer) => {
				FrameGovernor($$renderer, { playing: () => puck.playing });
				$$renderer.push(`<!----> `);
				GlobeStage($$renderer, {
					puck,
					imagery,
					layers,
					lettering,
					onshown: (data) => {
						if (!data) ({top, bottom} = DAY_SKY);
					},
					onsky: (t, b) => (top = t, bottom = b)
				});
				$$renderer.push(`<!---->`);
			},
			$$slots: { default: true }
		});
		$$renderer.push(`<!----></div>`);
	});
}
// ../../packages/puck/src/lib/puck.svelte.ts
var DEFAULTS = {
	radius: 4e3,
	exaggeration: 2,
	fogIn: 1.2,
	fogOut: 2.6,
	halo: true,
	surface: "painted"
};
var FOG_GAP = .3;
var PuckState = class {
	radius = DEFAULTS.radius;
	exaggeration = DEFAULTS.exaggeration;
	fogIn = DEFAULTS.fogIn;
	fogOut = DEFAULTS.fogOut;
	halo = DEFAULTS.halo;
	surface = DEFAULTS.surface;
	layers = {
		contours: true,
		roads: true,
		water: true,
		parks: true,
		weather: true,
		labels: true,
		marker: true
	};
	/** what's on the globe (null: the meadow, before any search) */
	loaded = null;
	/** the card with search and settings is open (folded: just a pill) */
	controls = true;
	/** being fetched: the old land waits half sunk */
	pending = false;
	error = null;
	time = Date.now() / 1e3;
	playing = false;
	/** seconds of the day per real second */
	rate = 600;
	/** a place has landed on the puck (an app might keep it in the address bar) */
	onplace = null;
	request = 0;
	/** Fly to a place (or reload the current one at a new size). */
	async go(spot) {
		const id = ++this.request;
		this.pending = true;
		this.error = null;
		const radius = this.radius;
		const fogOut = this.fogOut;
		const reach = radius * fogOut * 1.05;
		try {
			const [near, far, map, weather] = await Promise.all([
				heights(spot, radius * 1.1, zoomFor(radius * 1.1, spot.lat, 5, 12)),
				heights(spot, reach, reach <= 9e3 ? 11 : reach <= 2e4 ? 10 : reach <= 45e3 ? 9 : zoomFor(reach, spot.lat, 4, 8)),
				mapAround(spot, radius * 1.1, reach),
				weatherFor(spot)
			]);
			if (id !== this.request) return;
			if (!Number.isFinite(near(0, 0))) throw new Error("no elevation data there");
			const same = this.loaded?.spot === spot;
			this.loaded = {
				spot,
				radius,
				fogOut,
				near,
				far,
				map,
				weather
			};
			if (!same) this.time = Date.now() / 1e3;
			this.onplace?.(spot);
		} catch (e) {
			if (id === this.request) this.error = `Couldn't load ${spot.name}: ${e.message}`;
		} finally {
			if (id === this.request) this.pending = false;
		}
	}
	/** The local day the slider runs through: [start, end) in epoch seconds. */
	get day() {
		const w = this.loaded?.weather;
		const offset = w?.utcOffset ?? Math.round((this.loaded?.spot.lon ?? 0) / 15) * 3600;
		const start = w?.dayStart ?? Math.floor((this.time + offset) / 86400) * 86400 - offset;
		return [start, start + 86400];
	}
	/** Move the clock on (playing): round and round the same day. */
	advance(dt) {
		if (!this.playing) return;
		const [a, b] = this.day;
		let t = this.time + dt * this.rate;
		if (t >= b) t = a + (t - a) % 86400;
		this.time = t;
	}
	/** "14:05" in the place's own time zone */
	clock(t = this.time) {
		const offset = (this.loaded?.weather)?.utcOffset ?? Math.round((this.loaded?.spot.lon ?? 0) / 15) * 3600;
		return (/* @__PURE__ */ new Date((t + offset) * 1e3)).toISOString().slice(11, 16);
	}
	/** A place as an address-bar query (?lat=…&lon=…&name=…), so a refresh or a shared link comes back to it. */
	static toQuery(spot) {
		return `?${new URLSearchParams({
			lat: spot.lat.toFixed(5),
			lon: spot.lon.toFixed(5),
			name: spot.name
		})}`;
	}
	/** A place from the address bar, if there is one. */
	static fromUrl() {
		const q = new URLSearchParams(location.search);
		const lat = parseFloat(q.get("lat") ?? "");
		const lon = parseFloat(q.get("lon") ?? "");
		if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
		return {
			lat,
			lon,
			name: q.get("name") || formatLonLat({
				lon,
				lat
			}, 3)
		};
	}
};
Math.PI * (3 - Math.sqrt(5));
var T = (1 + Math.sqrt(5)) / 2;
(() => {
	const v = [
		-1,
		T,
		0,
		1,
		T,
		0,
		-1,
		-T,
		0,
		1,
		-T,
		0,
		0,
		-1,
		T,
		0,
		1,
		T,
		0,
		-1,
		-T,
		0,
		1,
		-T,
		T,
		0,
		-1,
		T,
		0,
		1,
		-T,
		0,
		-1,
		-T,
		0,
		1
	];
	const l = Math.hypot(1, T);
	return v.map((x) => x / l);
})();
// src/lib/ui/Credits.svelte
function Credits($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { app } = $$props;
		const parts = derived(() => [
			"Elevation: Terrarium tiles (Mapzen, AWS Open Data)",
			...app.surface !== "painted" ? [SOURCES[app.surface].attribution] : [],
			`Map ${OSM_ATTRIBUTION}, via OpenFreeMap`,
			WEATHER_ATTRIBUTION,
			SEARCH_ATTRIBUTION
		]);
		$$renderer.push(`<p class="credits svelte-1jnrrwo">${escape_html(parts().join(" · "))}</p>`);
	});
}
// src/lib/ui/Search.svelte
function Search($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { app } = $$props;
		let q = "";
		let open = false;
		const coords = derived(() => parseCoordinates(q));
		$$renderer.push(`<form${attr_class("search svelte-dm8w6y", void 0, { "placed": !!app.loaded })} role="search"><label for="q" class="sr svelte-dm8w6y">Search for a place, or type coordinates</label> <div class="box svelte-dm8w6y"><input id="q" type="search" autocomplete="off" placeholder="A place, or 53.07, -4.08"${attr("value", q)} role="combobox"${attr("aria-expanded", open)} aria-controls="q-results" aria-autocomplete="list"${attr("aria-activedescendant", void 0)} class="svelte-dm8w6y"/> <button type="submit" class="go svelte-dm8w6y" aria-label="Go">${escape_html("→")}</button></div> `);
		if (coords()) $$renderer.push(`<!--[0--><p class="hint svelte-dm8w6y">Enter to go to ${escape_html(formatLonLat(coords(), 3))}</p>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <div class="chips-row svelte-dm8w6y"><button type="button" class="mini svelte-dm8w6y"><span aria-hidden="true">◎</span> Where I am</button> <!--[-->`);
		const each_array_1 = ensure_array_like(SUGGESTIONS);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let s = each_array_1[$$index_1];
			$$renderer.push(`<button type="button" class="mini svelte-dm8w6y">${escape_html(s.name)}</button>`);
		}
		$$renderer.push(`<!--]--></div></form>`);
	});
}
// src/lib/ui/Panel.svelte
function Panel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { app } = $$props;
		const data = derived(() => app.loaded);
		const height = derived(() => data() ? Math.round(Math.max(0, data().near(0, 0))) : null);
		const park = derived(() => data() ? parkAt(data().map.parks, 0, 0) : null);
		const wx = derived(() => data() ? weatherAt(data().weather, app.time) : null);
		const surfaces = [
			{
				id: "painted",
				label: "Painted"
			},
			{
				id: "satellite",
				label: "Satellite"
			},
			{
				id: "sentinel",
				label: "Sentinel-2"
			},
			{
				id: "topo",
				label: "Topo"
			}
		];
		const toggles = [
			{
				key: "contours",
				label: "Elevation lines"
			},
			{
				key: "roads",
				label: "Roads"
			},
			{
				key: "water",
				label: "Water"
			},
			{
				key: "parks",
				label: "Parks"
			},
			{
				key: "weather",
				label: "Weather"
			},
			{
				key: "labels",
				label: "Place names"
			},
			{
				key: "marker",
				label: "Pin"
			}
		];
		let size = app.radius;
		let reach = app.fogOut;
		const km = (m) => `${(m / 1e3).toFixed(m < 1e4 ? 1 : 0)} km`;
		const open = derived(() => app.controls);
		$$renderer.push(`<section${attr_class("panel svelte-d13yz0", void 0, {
			"scroll-y": open(),
			"closed": !open()
		})} aria-label="Place and settings"><div class="head svelte-d13yz0"><h1 class="brand svelte-d13yz0"><span class="mark svelte-d13yz0" aria-hidden="true">◍</span> Geo Puck</h1> `);
		if (!open() && data()) $$renderer.push(`<!--[0--><span class="where svelte-d13yz0">${escape_html(data().spot.name)}</span>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <button type="button" class="fold svelte-d13yz0"${attr("aria-expanded", open())} aria-controls="panel-body"${attr("aria-label", open() ? "Hide the controls" : "Show the controls")}${attr("title", open() ? "Hide the controls" : "Search and settings")}><span aria-hidden="true">${escape_html(open() ? "−" : "+")}</span></button></div> `);
		if (open()) {
			$$renderer.push(`<!--[0--><div id="panel-body">`);
			Search($$renderer, { app });
			$$renderer.push(`<!----> `);
			if (app.error) $$renderer.push(`<!--[0--><p class="error svelte-d13yz0" role="alert">${escape_html(app.error)}</p>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (app.pending) $$renderer.push(`<!--[0--><p class="loading svelte-d13yz0" role="status">Fetching the land, the map and the weather…</p>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (data()) {
				$$renderer.push(`<!--[0--><div class="place svelte-d13yz0"><h2 class="svelte-d13yz0">${escape_html(data().spot.name)}</h2> <p class="facts svelte-d13yz0">${escape_html(formatLonLat(data().spot))}`);
				if (height() !== null) $$renderer.push(`<!--[0--> · ${escape_html(height().toLocaleString())} m`);
				else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></p> <p class="tags svelte-d13yz0">`);
				if (park() && app.layers.parks) $$renderer.push(`<!--[0--><span class="tag sage svelte-d13yz0"><span aria-hidden="true">⛰</span> ${escape_html(park())}</span>`);
				else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--> `);
				if (wx()) {
					$$renderer.push("<!--[0-->");
					const l = weatherLabel(wx().code, wx().isDay);
					$$renderer.push(`<span class="tag sky svelte-d13yz0"><span aria-hidden="true">${escape_html(l.icon)}</span> ${escape_html(l.label)}, ${escape_html(Math.round(wx().temp))}°C · wind ${escape_html(Math.round(wx().wind))} mph</span>`);
				} else $$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]--></p></div>`);
			} else if (!app.pending) $$renderer.push(`<!--[1--><p class="intro svelte-d13yz0">Pick somewhere and its landscape rises out of the plinth: real heights, the real sun and moon for the time of day, and today's weather there.</p>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <details class="customise svelte-d13yz0"><summary class="svelte-d13yz0">Customise the globe</summary> <fieldset class="knobs"><legend>Surface</legend> <div class="pills"><!--[-->`);
			const each_array = ensure_array_like(surfaces);
			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let s = each_array[$$index];
				$$renderer.push(`<button type="button"${attr("aria-pressed", app.surface === s.id)}>${escape_html(s.label)}</button>`);
			}
			$$renderer.push(`<!--]--></div></fieldset> <fieldset class="knobs"><legend>Show</legend> <div class="chips"><!--[-->`);
			const each_array_1 = ensure_array_like(toggles);
			for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
				let t = each_array_1[$$index_1];
				$$renderer.push(`<label class="chip"><input type="checkbox"${attr("checked", app.layers[t.key], true)}/><span class="tick" aria-hidden="true"></span>${escape_html(t.label)}</label>`);
			}
			$$renderer.push(`<!--]--> <label class="chip"><input type="checkbox"${attr("checked", app.halo, true)}/><span class="tick" aria-hidden="true"></span>Surroundings</label></div></fieldset> <label class="slider"><span>Size <output>${escape_html(km(size))} to the rim</output></span> <input type="range" min="800" max="6000" step="200"${attr("value", size)}${attr("aria-valuetext", `${stringify(km(size))} from the centre to the rim`)}/></label> <label class="slider"><span>Relief <output>${escape_html(app.exaggeration.toFixed(1))}×</output></span> <input type="range" min="1" max="4" step="0.1"${attr("value", app.exaggeration)}/></label> `);
			if (app.halo) $$renderer.push(`<!--[0--><label class="slider"><span>Surroundings begin <output>${escape_html(km(app.fogIn * app.radius))}</output></span> <input type="range"${attr("min", 1)}${attr("max", reach - FOG_GAP)} step="0.05"${attr("value", app.fogIn)}/></label> <label class="slider"><span>…and fade out by <output>${escape_html(km(reach * app.radius))}</output></span> <input type="range"${attr("min", app.fogIn + FOG_GAP)}${attr("max", 5)} step="0.05"${attr("value", reach)}/></label>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> <button type="button" class="reset svelte-d13yz0"><span aria-hidden="true">↺</span> Reset to the defaults</button> <p class="hint svelte-d13yz0">Drag to turn the globe · scroll or pinch to zoom.</p></details></div>`);
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--></section>`);
	});
}
// src/lib/ui/TimeDock.svelte
function TimeDock($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { app } = $$props;
		const day = derived(() => app.day);
		const clock = derived(() => app.clock());
		const progress = derived(() => (app.time - day()[0]) / 86400 * 100);
		const wx = derived(() => weatherAt(app.loaded?.weather ?? null, app.time));
		const wxText = derived(() => wx() ? `${weatherLabel(wx().code, wx().isDay).label}, ${Math.round(wx().temp)}°C` : "");
		const wxIcon = derived(() => wx() ? weatherLabel(wx().code, wx().isDay).icon : "");
		$$renderer.push(`<div class="dock svelte-wr3koo" role="group" aria-label="Time of day"><button type="button"${attr_class("pp svelte-wr3koo", void 0, { "playing": app.playing })}${attr("aria-label", app.playing ? "Pause" : "Play the day")}>${escape_html(app.playing ? "❚❚" : "▶")}</button> `);
		$$renderer.select({
			value: app.rate,
			"aria-label": "Playback speed",
			class: ""
		}, ($$renderer) => {
			$$renderer.option({ value: 120 }, ($$renderer) => {
				$$renderer.push(`2 min/s`);
			});
			$$renderer.option({ value: 600 }, ($$renderer) => {
				$$renderer.push(`10 min/s`);
			});
			$$renderer.option({ value: 1800 }, ($$renderer) => {
				$$renderer.push(`30 min/s`);
			});
			$$renderer.option({ value: 3600 }, ($$renderer) => {
				$$renderer.push(`1 h/s`);
			});
		}, "svelte-wr3koo");
		$$renderer.push(` <span class="clock svelte-wr3koo" aria-live="off">${escape_html(clock())}</span> <button type="button" class="now svelte-wr3koo">Now</button> `);
		if (wxText()) $$renderer.push(`<!--[0--><span class="wx svelte-wr3koo"${attr("title", wxText())}><span aria-hidden="true">${escape_html(wxIcon())}</span> <span class="wxt svelte-wr3koo">${escape_html(wxText())}</span></span>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <input class="through svelte-wr3koo" type="range"${attr("min", day()[0])}${attr("max", day()[1] - 60)} step="60"${attr("value", app.time)} aria-label="Time of day"${attr("aria-valuetext", clock())}${attr_style("", { "--p": `${stringify(progress())}%` })}/></div>`);
	});
}
// src/routes/+page.svelte
function _page($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const app = new PuckState();
		derived(() => []);
		head("1uha8ag", $$renderer, ($$renderer) => {
			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>${escape_html(app.loaded ? `${app.loaded.spot.name} · Geo Puck` : "Geo Puck")}</title>`);
			});
		});
		$$renderer.push(`<main class="svelte-1uha8ag">`);
		{
			function layers($$renderer, ctx) {
				$$renderer.push("<!--[-1-->");
				$$renderer.push(`<!--]-->`);
			}
			Globe($$renderer, {
				puck: app,
				layers,
				$$slots: { layers: true }
			});
		}
		$$renderer.push(`<!----> `);
		Panel($$renderer, { app });
		$$renderer.push(`<!----> `);
		if (app.loaded) {
			$$renderer.push("<!--[0-->");
			TimeDock($$renderer, { app });
		} else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		$$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> `);
		Credits($$renderer, { app });
		$$renderer.push(`<!----></main>`);
	});
}
export { _page as default };
