# Geo Puck

Any place on Earth as a terrain diorama on a compass plinth, as libraries you can build on. Give it
a place and its landscape rises out of the plinth with real heights, map lines and place names, the
real sun and moon for the time of day there, and today's weather. Then put your own things on the
land: a route, pins, or a forest that grows a tree for each point in your data.

Everything is fetched live from free, open sources. There are no API keys and no server.

| Package | What it is | Needs |
| --- | --- | --- |
| [`@jonibach/geo-puck-data`](packages/data) | The data behind a puck, as plain TypeScript: terrain heights, OpenStreetMap shapes, weather, place search, sun and moon | A browser, or Node 20+ |
| [`@jonibach/geo-puck`](packages/puck) | The puck itself, as Svelte components drawn with Three.js | Svelte 5, Three.js, Threlte 8 |
| [`apps/demo`](apps/demo) | A small app on the two packages: search for anywhere and look at it | |

The code began as [Geo Globe](https://github.com/JoniBach/geo-globe), a Three.js workshop demo.

## Use it

```svelte
<script lang="ts">
	import { GeoPuck, PuckState } from '@jonibach/geo-puck';

	const puck = new PuckState();
	puck.go({ name: 'Yr Wyddfa', lat: 53.0685, lon: -4.0763 });
</script>

<div style="position: fixed; inset: 0"><GeoPuck {puck} /></div>
```

`PuckState` holds what is shown and how. Its fields are reactive, so changing one changes the puck.

| Field | Meaning | Default |
| --- | --- | --- |
| `radius` | Metres from the centre to the rim, from 800 to about 80,000. Call `go` again after changing it | 4,000 |
| `exaggeration` | How many times taller than life the relief stands. A wide puck needs more | 2 |
| `surface` | `painted`, `satellite`, `sentinel` or `topo` | `painted` |
| `layers` | Switches for contours, roads, water, parks, weather, labels and the centre marker | all on |
| `time` | The moment shown, in seconds since 1970. It sets the sun, the moon and the light | now |
| `halo`, `fogIn`, `fogOut` | The faint surroundings beyond the rim, and where they begin and fade | on, 1.2, 2.6 |

`puck.go(spot)` loads a place and resolves when it is on the plinth. `puck.onplace` is called each
time one lands. `puck.loaded` is the place now shown, with its heights and map data.

## Layers of your own

`<GeoPuck>` takes a `layers` snippet. Whatever it draws sits on the land, in the land's own
coordinates: metres east (`x`) and north (`n`) of the centre. The snippet is handed a context with
the ground sampler, the conversion from longitude and latitude, the radius and the current
exaggeration.

```svelte
<GeoPuck {puck}>
	{#snippet layers(ctx)}
		<!-- a post standing on the ground 500 m east of the centre -->
		<T.Mesh position={[500, ctx.globe.ground(500, 0) * ctx.exaggeration, 0]}>…</T.Mesh>
	{/snippet}
</GeoPuck>
```

The `lettering` prop replaces the words around the plinth (by default the place's name and where it is).

## The forest

`Forest` is a ready-made layer: one tree for each point. Each tree is grown from its own seed, so
the same seed always gives the same tree, and three things about it are driven by your data.

| Field | Meaning |
| --- | --- |
| `x`, `n` | Where it stands, in metres east and north of the centre (`ctx.plane.toLocal(lon, lat)`) |
| `seed` | Any whole number. `seedOf('a name')` turns a name into one |
| `age` | 0 for a seedling to 1 for a full-grown tree. Boughs come out one by one as it rises |
| `leaves` | How many clusters of leaves it carries, up to 96. Zero is a bare tree |
| `colour` | The colour of the leaves, as red, green and blue from 0 to 1 |
| `size` | Its full-grown height relative to the forest's (optional) |

```svelte
<script lang="ts">
	import { Forest, GeoPuck, seedOf, type TreeSpec } from '@jonibach/geo-puck';

	const trees: TreeSpec[] = [{ id: 'oak', x: 0, n: 0, seed: seedOf('oak'), age: 0.8, leaves: 40, colour: [0.28, 0.55, 0.27] }];
</script>

<GeoPuck {puck}>
	{#snippet layers(ctx)}
		<Forest {ctx} {trees} onhover={(tree) => …} onpick={(tree) => …} />
	{/snippet}
</GeoPuck>
```

A tree's skeleton is fixed by its seed; `age` only decides how far each bough has grown. Changing
`age` a little therefore changes the tree a little, and a slider grows a forest smoothly. The whole
forest is one mesh, rebuilt when `trees` changes (a few milliseconds for a few hundred trees), and
lit by the puck's own sun. Trees are symbols and are drawn far larger than life: `height` sets a
full-grown tree's height as a share of the puck's radius.

## Just the data

`@jonibach/geo-puck-data` works without the components, for a different renderer or for baking data
ahead of time in Node.

```ts
import { heights, mapAround, sunAt, weatherFor } from '@jonibach/geo-puck-data';

const spot = { lon: -4.0763, lat: 53.0685 };
const heightAt = await heights(spot, 5000, 12); // metres above sea level at local (x, n)
const map = await mapAround(spot, 5000, 12000); // roads, rivers, parks, places, in local metres
const weather = await weatherFor(spot);
const sun = sunAt(Date.now() / 1000, spot.lat, spot.lon);
```

## Where the data comes from

| What | Source | Terms |
| --- | --- | --- |
| Heights | [Terrarium tiles](https://registry.opendata.aws/terrain-tiles/) (Mapzen, on AWS Open Data) | Open, attribution asked |
| Roads, rivers, water, parks, names | OpenStreetMap through [OpenFreeMap](https://openfreemap.org) | ODbL, © OpenStreetMap contributors |
| Satellite imagery | Esri World Imagery | Esri's terms; attribution required |
| Sentinel-2 imagery | EOX Sentinel-2 cloudless 2023 | CC BY-NC-SA 4.0 |
| Topographic map | OpenTopoMap | CC BY-SA |
| Weather and time zone | [Open-Meteo](https://open-meteo.com) | CC BY 4.0 |
| Place search | [Photon](https://photon.komoot.io) (komoot) | © OpenStreetMap contributors |
| Sun and moon | Astronomy formulas, worked out locally | |

An app that shows a puck must show these credits. Each module exports its own attribution text.

## Work on it

```sh
npm install
npm run dev          # the demo at http://localhost:5173, running the packages from source
npm run check        # types, all three workspaces
npm run build        # packages/*/dist
npm test             # tests of the built packages
npm run pack         # dist-packs/*.tgz, as they would be published
node tests/shot.mjs '/?lat=53.0685&lon=-4.0763&name=Yr%20Wyddfa&forest&hour=13' out.png   # a picture, with Chrome
```

The demo takes `?lat=…&lon=…&name=…` for a place, `&radius=40000` for a wider puck, `&hour=13` for
a time of day and `&forest` to plant a tree at each named place.

## Releasing

Everything is released by GitHub Actions when a pull request is merged to `main`
([release.yml](.github/workflows/release.yml)). Nothing is published or deployed by hand.

1. In a pull request, raise `version` in both packages' `package.json` (they share one version),
   and the puck's dependency on the data package to match.
2. Merge it. The workflow runs the checks again, makes the GitHub release `v<version>` with both
   packages attached as `.tgz` files, publishes them to npm, and deploys the demo to GitHub Pages.

A merge that leaves the version alone releases nothing and only re-deploys the demo. Publishing to
npm waits for the repository variable `NPM_PUBLISH` to be `true`: npm needs each package published
once by hand before the repository can be made its trusted publisher. Until then an app can install
from the release files:

```json
"@jonibach/geo-puck": "https://github.com/JoniBach/geo-puck/releases/download/v0.1.0/jonibach-geo-puck-0.1.0.tgz"
```

## Limits

- Heights come as 20 to 40 m pixels, so summits read a little low.
- Web Mercator tiles stop at about 85° north and south.
- The land is treated as flat around its centre. On an 80 km puck the rim is a few hundred metres out.
- The weather is today's forecast, whatever `time` is set to.
- A network connection is needed: every source is live.

## Words used here

- **Puck**: the round piece of land standing on its plinth.
- **Plinth**: the compass ring the land stands on, with lettering around it.
- **Local metres**: positions on the land, as metres east (`x`) and north (`n`) of its centre.
- **Exaggeration**: how many times taller than life the relief is drawn.
- **Layer**: something of your own drawn on the land.
- **Tile**: one square of a map served at a zoom level; the puck fetches the few that cover it.

## Licence

MIT for the code. The data shown keeps its own terms, listed above.
