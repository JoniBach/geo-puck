<!--
  The globe: a place's landscape as a round diorama on a plinth. North is always the same way (-z);
  you turn the globe by orbiting the camera, it never turns itself. The sun and moon sit where they
  really are for that place and moment, and set the light, the shadows' direction and (via onsky)
  the sky behind. The weather is the forecast for that hour.
-->
<script lang="ts" module>
	import { Vector3 as V3 } from 'three';
	/**
	 * Where the sun and moon last were on screen, carried from one place's globe to the next so they
	 * glide to their new places instead of jumping (null before the first place).
	 */
	const carried: { sun: V3 | null; moon: V3 | null } = { sun: null, moon: null };
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import { T, useTask } from '@threlte/core';
	import { CanvasTexture, Color, Group, Mesh, ShaderMaterial, SphereGeometry, Sprite, SpriteMaterial, Vector3 } from 'three';
	import type { PuckState, Loaded } from './puck.svelte.js';
	import type { Imagery } from './imagery.js';
	import { weatherAt } from '@jonibach/geo-puck-data';
	import DioramaTerrain from './DioramaTerrain.svelte';
	import GlobeHalo from './GlobeHalo.svelte';
	import GlobeLabels from './GlobeLabels.svelte';
	import GlobeLines from './GlobeLines.svelte';
	import GlobeWeather from './GlobeWeather.svelte';
	import Marker from './Marker.svelte';
	import { globeLines } from './lines.js';
	import { direction, moonAt, skyColours, sunAt } from '@jonibach/geo-puck-data';
	import { easeLight, type LightGoal } from './lighting.js';
	import { GlobeState, type PuckLayerContext } from './state.js';
	import type { OrbitControls as Controls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { busy } from './FrameGovernor.svelte';
	import { localPlane } from '@jonibach/geo-puck-data';

	let {
		puck,
		data,
		imagery,
		layers,
		controls,
		onsky,
		onshadow,
		rise
	}: {
		/** the camera's controls (the stage's): flown to the puck's focus */
		controls?: Controls;
		puck: PuckState;
		data: Loaded;
		imagery: Imagery;
		layers?: Snippet<[PuckLayerContext]>;
		onsky: (top: string, bottom: string) => void;
		/** how dark the plinth's shadow should be */
		onshadow: (s: number) => void;
		/** how far the relief has risen out of the plinth, 0 (flat) to 1: the stage's transitions */
		rise: () => number;
	} = $props();

	/** the globe's size on screen (scene units): fixed; the landscape is scaled to fit it */
	const V = 1800;
	// svelte-ignore state_referenced_locally — a new place or size remounts this scene
	const R = data.radius;
	const RAD = Math.PI / 180;
	const globe = new GlobeState(V);
	// svelte-ignore state_referenced_locally — as above
	const plane = localPlane(data.spot);

	// the map's lines: roads, rivers, park edges (each follows its switch)
	const lines = $derived(globeLines(data.map, { roads: puck.layers.roads, rivers: puck.layers.water, parks: puck.layers.parks }));

	// the landscape group: scaled so its radius R fills the globe's fixed size V, floor at y = 0
	const land = new Group();
	let exag = $state(2);
	/** labels stand at full height: they wait until the land has risen */
	let settled = $state(false);
	// the land fades away only at the very end of its fall, and back in at the very start of its rise
	const shown = () => {
		const u = Math.min(1, rise() / 0.18);
		return u * u * (3 - 2 * u);
	};
	// the surroundings keep their full height and open out like an aperture instead; this holds
	// them level while the land beside them rises
	let haloLift = $state(0);
	// …and as it goes flat it drops just below the plinth's floor (two surfaces at one height flicker)
	let sink = $state(0);
	let centreHeight = $state(0);

	// sun and moon: small bodies on a wide arc around the globe
	const ORBIT = V * 1.55;
	const glow = (() => {
		const c = document.createElement('canvas');
		c.width = c.height = 128;
		const ctx = c.getContext('2d')!;
		const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
		g.addColorStop(0, 'rgba(255, 244, 214, 1)');
		g.addColorStop(0.25, 'rgba(255, 214, 140, 0.9)');
		g.addColorStop(1, 'rgba(255, 200, 120, 0)');
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, 128, 128);
		return new CanvasTexture(c);
	})();
	// the moon lit by the sun: its phase shows for free
	const moonGeo = new SphereGeometry(V * 0.05, 32, 16);
	const moonMat = new ShaderMaterial({
		uniforms: { uSun: { value: new Vector3(0, 1, 0) } },
		vertexShader: /* glsl */ `
			varying vec3 vN;
			void main() {
				vN = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
		`,
		fragmentShader: /* glsl */ `
			uniform vec3 uSun;
			varying vec3 vN;
			void main() {
				float lit = smoothstep(-0.05, 0.15, dot(normalize(vN), uSun));
				gl_FragColor = vec4(mix(vec3(0.42, 0.46, 0.58), vec3(0.98, 0.96, 0.90), lit), 1.0);
			}
		`
	});

	const sunBody = new Sprite(new SpriteMaterial({ map: glow, depthWrite: false, transparent: true }));
	sunBody.scale.setScalar(V * 0.32);
	const moonBody = new Mesh(moonGeo, moonMat);
	let shadow = 0.5;
	const goal: LightGoal = { colour: new Color(), strength: 1, dir: new Vector3(0, 1, 0), daylight: 1, hemi: 1, hemiColour: new Color() };
	const night = new Vector3(0.2, 1, 0.3).normalize();
	const sunGoal = new Vector3();
	const moonGoal = new Vector3();
	let sunNow: Vector3 | null = null;
	let moonNow: Vector3 | null = null;

	let sunLight = $state<import('three').DirectionalLight>();
	let hemi = $state<import('three').HemisphereLight>();
	let sky = '';

	useTask((dt) => {
		puck.advance(Math.min(dt, 0.1));
		const r = rise();
		exag = puck.exaggeration * r;
		if (settled !== r > 0.999) settled = r > 0.999;
		haloLift = Number.isFinite(globe.base) ? globe.base * (exag - puck.exaggeration) : 0;
		// in the land's own metres (it's scaled by V / R): 3% of the globe's size below the floor at flat
		sink = -(1 - shown()) * V * 0.03 * (R / V);
		const k = V / R;
		land.scale.setScalar(k);
		if (Number.isFinite(globe.base)) land.position.set(0, -globe.base * exag * k, 0);
		centreHeight = globe.ground(0, 0);

		// weather now
		const w = weatherAt(data.weather, puck.time);
		globe.weather = w;
		const drizzle = w && w.code >= 51 && w.code <= 57 ? 0.25 : 0;
		globe.rain = puck.layers.weather && w ? Math.min(1, Math.max(drizzle, w.precip / 1.5)) : 0;

		// sun and moon for this place and moment
		const { lon, lat } = data.spot;
		const sun = sunAt(puck.time, lat, lon);
		const moon = moonAt(puck.time, lat, lon);
		// glide from where they were (the last place's sky) to where they really are, on a big arc;
		// once there, follow the clock closely (quick enough for fast playback)
		sunGoal.set(...direction(sun));
		moonGoal.set(...direction(moon));
		if (!sunNow) sunNow = (carried.sun ?? sunGoal).clone();
		if (!moonNow) moonNow = (carried.moon ?? moonGoal).clone();
		const glide = (now: Vector3, goal: Vector3) => {
			const far = now.angleTo(goal);
			now.lerp(goal, Math.min(1, dt * (far > 0.05 ? 2.2 : 12))).normalize();
		};
		glide(sunNow, sunGoal);
		glide(moonNow, moonGoal);
		carried.sun = sunNow.clone();
		carried.moon = moonNow.clone();
		globe.sunDir.copy(sunNow);
		globe.moonDir.copy(moonNow);
		sunBody.position.copy(globe.sunDir).multiplyScalar(ORBIT);
		moonBody.position.copy(globe.moonDir).multiplyScalar(ORBIT);
		// up when above the horizon, and in or out with the land between places
		const here = Math.min(1, r * 1.5);
		sunBody.visible = globe.sunDir.y > Math.sin(-2 * RAD) && here > 0.01;
		sunBody.material.opacity = here;
		moonBody.visible = globe.moonDir.y > Math.sin(-2 * RAD) && sun.alt < 12 * RAD && here > 0.01;
		moonBody.scale.setScalar(Math.max(0.001, here));
		moonMat.uniforms.uSun.value.copy(globe.sunDir);

		// light: the sun by day; the moon (or a faint sky glow) by night. Worked out for this moment,
		// then eased from whatever light the globe had, so it glides rather than snapping
		const deg = sun.alt / RAD;
		const daylight = Math.min(1, Math.max(0, (deg + 8) / 16));
		const colours = skyColours(sun.alt, puck.layers.weather && w ? w.cloud / 100 : 0, globe.rain);
		goal.colour.set(colours.light);
		if (deg > -3) {
			goal.dir.copy(globe.sunDir);
			if (goal.dir.y < 0.08) goal.dir.setY(0.08).normalize(); // grazing, never from below
			goal.strength = 0.25 + 0.75 * Math.min(1, Math.max(0, (deg + 3) / 20));
		} else {
			goal.dir.copy(moon.alt > 0 ? globe.moonDir : night);
			goal.strength = moon.alt > 0 ? 0.3 : 0.12;
		}
		// overcast softens the direct light
		if (puck.layers.weather && w) goal.strength *= 1 - 0.45 * (w.cloud / 100);
		goal.daylight = daylight;
		goal.hemi = 0.55 + 0.6 * daylight;
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
		const s = Math.round((0.2 + 0.35 * now.daylight) * 20) / 20;
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

	// ---- the focus: flying the camera down to a point on the land, and turning around it ---------
	const anchor = new Group();
	land.add(anchor);
	const aim = new Vector3();
	const from = new Vector3();
	const offset = new Vector3();
	const HOME = new Vector3(0, V * 0.04, 0);
	/** the view to come back to: where the camera was before it first came down */
	let home: { distance: number; polar: number; min: number; max: number; polarMax: number } | null = null;
	let flying: { key: unknown; t: number; from: Vector3; distance: [number, number]; polar: [number, number]; azimuth: [number, number] | null } | null = null;
	let flown: unknown = null;
	const ease = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
	// dragging cuts a flight short: the view stays turned around the focus from where it is
	$effect(() => {
		if (!controls) return;
		const stop = () => (flying = null);
		controls.addEventListener('start', stop);
		return () => controls.removeEventListener('start', stop);
	});

	useTask((dt) => {
		if (!controls) return;
		const f = puck.focus;
		const k = V / R;
		// where the camera turns around now, in the scene
		if (f) {
			const g = globe.ground(f.x, f.n);
			const [east, up, north] = f.offset ?? [0, 0, 0];
			anchor.position.set(f.x + east, (Number.isFinite(g) ? g : 0) * exag + (f.height ?? 0) + up, -(f.n + north));
			land.updateMatrixWorld(true);
			anchor.getWorldPosition(aim);
		} else aim.copy(HOME);
		const cam = controls.object;
		if (f !== flown) {
			// a new flight, from wherever the view is now
			offset.copy(cam.position).sub(controls.target);
			const distance = offset.length();
			const polar = Math.acos(Math.min(1, Math.max(-1, offset.y / distance)));
			if (!home) home = { distance, polar, min: controls.minDistance, max: controls.maxDistance, polarMax: controls.maxPolarAngle };
			const toDistance = f ? (f.distance ?? R * 0.1) * k : home.distance;
			const toPolar = f ? Math.min(f.polar ?? 1.25, 1.45) : home.polar;
			const azimuth = Math.atan2(offset.x, offset.z);
			// a bearing is a compass direction (east of north); in the scene north is -z
			const toAzimuth = f?.bearing !== undefined ? Math.atan2(Math.sin(f.bearing), -Math.cos(f.bearing)) : null;
			flying = {
				key: f,
				t: 0,
				from: controls.target.clone(),
				distance: [distance, toDistance],
				polar: [polar, toPolar],
				azimuth: toAzimuth === null ? null : [azimuth, azimuth + Math.atan2(Math.sin(toAzimuth - azimuth), Math.cos(toAzimuth - azimuth))]
			};
			flown = f;
			// no limits while it flies; the focus's own once it lands
			controls.minDistance = 0;
			controls.maxDistance = Infinity;
			controls.maxPolarAngle = Math.max(home.polarMax, 1.48);
		}
		offset.copy(cam.position).sub(controls.target);
		let distance = offset.length();
		let polar = Math.acos(Math.min(1, Math.max(-1, offset.y / distance)));
		let azimuth = Math.atan2(offset.x, offset.z);
		if (flying) {
			flying.t = Math.min(1, flying.t + dt / 1.6);
			const u = ease(flying.t);
			from.copy(flying.from).lerp(aim, u);
			distance = flying.distance[0] + (flying.distance[1] - flying.distance[0]) * u;
			polar = flying.polar[0] + (flying.polar[1] - flying.polar[0]) * u;
			if (flying.azimuth) azimuth = flying.azimuth[0] + (flying.azimuth[1] - flying.azimuth[0]) * u;
			busy(400);
			if (flying.t >= 1) {
				flying = null;
				if (f) {
					controls.minDistance = distance * 0.35;
					controls.maxDistance = Math.max(distance * 3, R * 0.6 * k);
					controls.maxPolarAngle = 1.48;
				} else if (home) {
					controls.minDistance = home.min;
					controls.maxDistance = home.max;
					controls.maxPolarAngle = home.polarMax;
				}
			}
		} else if (f) from.copy(aim); // keep turning around it as the land settles
		else return;
		controls.target.copy(from);
		offset.set(Math.sin(polar) * Math.sin(azimuth), Math.cos(polar), Math.sin(polar) * Math.cos(azimuth)).multiplyScalar(distance);
		cam.position.copy(from).add(offset);
		controls.update();
	});

	$effect(() => imagery.show(puck.surface, data.spot, R * 1.02));

	$effect(() => () => {
		glow.dispose();
		sunBody.material.dispose();
		moonGeo.dispose();
		moonMat.dispose();
	});
</script>

<T.HemisphereLight bind:ref={hemi} args={['#dfeef7', '#d8cbb4', 1.2]} />
<T.DirectionalLight bind:ref={sunLight} position={[V, V * 2, V]} intensity={2} />

<T is={land}>
	<T.Group scale.y={exag} position.y={sink}>
		<DioramaTerrain {puck} {data} {globe} {imagery} fade={shown} />
		{#if lines.length}<GlobeLines {globe} radius={R} {lines} fade={shown} />{/if}
	</T.Group>
	{#if puck.halo}
		<T.Group scale.y={puck.exaggeration} position.y={haloLift}>
			<GlobeHalo {globe} radius={R} heights={data.far} contours={puck.layers.contours} {lines} open={rise} fogIn={puck.fogIn} fogOut={data.fogOut} />
		</T.Group>
	{/if}
	{#if settled}
		{#if puck.layers.labels}<GlobeLabels {globe} radius={R} places={data.map.places} exaggeration={puck.exaggeration} />{/if}
	{/if}
	{#if puck.layers.marker}<Marker radius={R} ground={centreHeight} exaggeration={exag} />{/if}
	{#if layers}{@render layers({ globe, plane, spot: data.spot, radius: R, exaggeration: exag, settled, rise })}{/if}
</T>

<GlobeWeather {globe} show={puck.layers.weather} presence={rise} />

<T is={sunBody} />
<T is={moonBody} />
