// Run after a build (npm run build): these test the packaged files, as an app would import them.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { direction, localPlane, mercX, mercY, parseCoordinates, sunAt, tileToLonLat, tilesAround, zoomFor } from '../dist/index.js';

test('a local plane is metres east and north of its centre, and goes back again', () => {
	const plane = localPlane({ lon: -4.0763, lat: 53.0685 });
	const [x, n] = plane.toLocal(-4.0763, 53.0785);
	assert.ok(Math.abs(x) < 1e-6);
	assert.ok(Math.abs(n - 1113.2) < 1, `0.01° of latitude is about 1.1 km, got ${n}`);
	const [lon, lat] = plane.toLonLat(...plane.toLocal(-3.9, 53.2));
	assert.ok(Math.abs(lon + 3.9) < 1e-9 && Math.abs(lat - 53.2) < 1e-9);
});

test('tile coordinates go to longitude and latitude and back', () => {
	const [lon, lat] = tileToLonLat(mercX(0.7522, 12), mercY(52.4128, 12), 12);
	assert.ok(Math.abs(lon - 0.7522) < 1e-9 && Math.abs(lat - 52.4128) < 1e-9);
});

test('a small puck keeps the sharpest tiles; a wide one steps down to a handful', () => {
	assert.equal(zoomFor(4400, 53, 5, 12), 12);
	assert.equal(zoomFor(6600, 53, 5, 12), 12);
	const z = zoomFor(55000, 53, 5, 12);
	assert.ok(z <= 10, `a 50 km puck should not ask for z12 tiles, got z${z}`);
	const tiles = tilesAround({ lon: 0.75, lat: 52.4 }, 55000, z);
	assert.ok(tiles.length <= 25, `${tiles.length} tiles`);
});

test('coordinates as people type them', () => {
	assert.deepEqual(parseCoordinates('53.068, -4.076'), { lon: -4.076, lat: 53.068 });
	assert.deepEqual(parseCoordinates('53.068° N 4.076° W'), { lon: -4.076, lat: 53.068 });
	assert.equal(parseCoordinates('Thetford'), null);
});

test('the midsummer midday sun is high in the south over Britain', () => {
	const sun = sunAt(Date.UTC(2026, 5, 21, 12, 0) / 1000, 52.4, 0.75);
	const [x, y, z] = direction(sun);
	assert.ok(sun.alt > (55 * Math.PI) / 180, 'above 55°');
	assert.ok(z > 0 && Math.abs(x) < 0.2 && y > 0.8, 'south is +z in the scene');
});
