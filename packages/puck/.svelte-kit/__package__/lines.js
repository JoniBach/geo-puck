// roads by tier: 0 major … 4 track
const ROAD_HALF = [0.0034, 0.0028, 0.0022, 0.0016, 0.0011];
const ROAD_ALPHA = [0.95, 0.9, 0.8, 0.6, 0.4];
const ROAD_HALO = [0.6, 0.5, 0.38, 0.25, 0.14];
export function globeLines(map, show) {
    const lines = [];
    if (show.parks)
        for (const park of map.parks.filter((p) => p.national))
            for (const xy of park.edges)
                lines.push({ xy, half: 0.0013, color: [0.17, 0.55, 0.27], alpha: 0.75, haloColor: [0.17, 0.55, 0.27], haloAlpha: 0.35, dash: true });
    if (show.rivers)
        for (const xy of map.rivers)
            lines.push({ xy, half: 0.0017, color: [0.42, 0.66, 0.86], alpha: 0.9, haloColor: [0.42, 0.62, 0.8], haloAlpha: 0.35, dash: false });
    if (show.roads)
        // minor roads first, so the main roads draw over them where they meet
        for (const road of [...map.roads].sort((a, b) => b.tier - a.tier)) {
            const t = road.tier;
            lines.push({
                xy: road.xy,
                half: ROAD_HALF[t],
                color: [1, 0.99, 0.96],
                alpha: ROAD_ALPHA[t],
                haloColor: [0.47, 0.49, 0.52],
                haloAlpha: ROAD_HALO[t],
                dash: false
            });
        }
    return lines;
}
