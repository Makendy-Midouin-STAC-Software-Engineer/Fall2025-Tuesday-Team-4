## Mapbox GL JS — iHike Frontend Guide (Vite + React)

This guide captures the essential Mapbox GL JS concepts and patterns we will use to build interactive hiking maps against our backend GeoJSON endpoints.

References:
- Guides: [`https://docs.mapbox.com/mapbox-gl-js/guides/`](https://docs.mapbox.com/mapbox-gl-js/guides/)
- Install: [`https://docs.mapbox.com/mapbox-gl-js/guides/install/`](https://docs.mapbox.com/mapbox-gl-js/guides/install/)
- API: [`https://docs.mapbox.com/mapbox-gl-js/api/`](https://docs.mapbox.com/mapbox-gl-js/api/)

---

### Project assumptions
- Build: Vite + React functional components.
- Styling: Tailwind CSS.
- Map library: `mapbox-gl` v3.x.
- Data: Backend returns GeoJSON FeatureCollections via DRF GIS.
  - `GET /api/route/` (filters: difficulty, route, length__gte, length__lte, in_bbox)
  - `GET /api/ways/` (filters: difficulty, highway, length__gte, length__lte, in_bbox)

Environment variables (frontend `.env` in Vercel / local):
- `VITE_MAPBOX_TOKEN` — Mapbox access token

---

### Installation (Vite)
```bash
npm i mapbox-gl
```

In `index.css` (or a global CSS):
```css
@import url('https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css');
```

---

### Minimal React component (map init)
Key API: `new mapboxgl.Map({ container, style, center, zoom, projection })`, `NavigationControl`, `on('load'|'style.load')`.

```tsx
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

export function HikingMap() {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<mapboxgl.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: 'mapbox://styles/mapbox/standard',
      projection: 'globe',
      center: [8.2275, 46.8182], // CH
      zoom: 6
    })

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }))
    map.scrollZoom.enable()

    map.on('style.load', () => {
      map.setFog({})
    })

    mapInstance.current = map
    return () => map.remove()
  }, [])

  return (
    <div className="h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
    </div>
  )
}
```

---

### Sources and layers (vector/geojson)
- Add a source: `map.addSource(id, { type: 'geojson', data })`
- Add a layer: `map.addLayer({ id, type, source, ... })`
- Update data: `map.getSource(id).setData(newData)` for GeoJSON sources

Example: render routes (MultiLineString) and ways with different styles.

```tsx
function addHikingLayers(map: mapboxgl.Map) {
  // Routes
  if (!map.getSource('routes')) {
    map.addSource('routes', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
  if (!map.getLayer('routes-line')) {
    map.addLayer({
      id: 'routes-line',
      type: 'line',
      source: 'routes',
      paint: {
        'line-color': [
          'interpolate', ['linear'], ['get', 'length'],
          0, '#60a5fa',
          10, '#22c55e',
          30, '#f59e0b',
          60, '#ef4444'
        ],
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          6, 2,
          12, 4,
          16, 6
        ]
      }
    }, 'road-label') // slot before labels when using Standard style
  }

  // Ways
  if (!map.getSource('ways')) {
    map.addSource('ways', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }
  if (!map.getLayer('ways-line')) {
    map.addLayer({
      id: 'ways-line',
      type: 'line',
      source: 'ways',
      paint: {
        'line-color': '#8b5cf6',
        'line-opacity': 0.5,
        'line-width': 2
      }
    })
  }
}
```

---

### Fetching backend GeoJSON (filters, bbox)
Endpoints (GeoJSON FeatureCollection):
- `/api/route/?difficulty=...&route=...&length__gte=...&length__lte=...&in_bbox=minx,miny,maxx,maxy`
- `/api/ways/?difficulty=...&highway=...&length__gte=...&length__lte=...&in_bbox=minx,miny,maxx,maxy`

Compute bbox from current view: `map.getBounds()`.

```tsx
async function fetchRoutes(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch routes')
  return res.json()
}

function bboxParam(map: mapboxgl.Map) {
  const b = map.getBounds()
  return `in_bbox=${b.getWest()},${b.getSouth()},${b.getEast()},${b.getNorth()}`
}

async function loadDataForViewport(map: mapboxgl.Map, baseUrl: string) {
  const routesUrl = `${baseUrl}/api/route/?${bboxParam(map)}`
  const waysUrl = `${baseUrl}/api/ways/?${bboxParam(map)}`
  const [routes, ways] = await Promise.all([
    fetchRoutes(routesUrl),
    fetchRoutes(waysUrl)
  ])

  const routesSource = map.getSource('routes') as mapboxgl.GeoJSONSource
  const waysSource = map.getSource('ways') as mapboxgl.GeoJSONSource
  routesSource.setData(routes)
  waysSource.setData(ways)
}
```

Useful map events for (re)loading data: `load`, `moveend`, `zoomend`, `idle`.

```tsx
function wireDataLoading(map: mapboxgl.Map, baseUrl: string) {
  const load = () => loadDataForViewport(map, baseUrl).catch(console.error)
  map.on('load', () => {
    addHikingLayers(map)
    load()
  })
  map.on('moveend', load)
  map.on('zoomend', load)
}
```

---

### Interaction: hover, click, popups
- Query features: `map.queryRenderedFeatures(point, { layers: [...] })`
- Popup: `new mapboxgl.Popup().setLngLat(...).setHTML(...).addTo(map)`

```tsx
function wireInteractions(map: mapboxgl.Map) {
  const layers = ['routes-line', 'ways-line']

  map.on('mousemove', (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers })
    map.getCanvas().style.cursor = f.length ? 'pointer' : ''
  })

  map.on('click', (e) => {
    const f = map.queryRenderedFeatures(e.point, { layers })
    if (!f.length) return
    const feat = f[0]
    const props = feat.properties as Record<string, unknown>
    const html = `
      <div class="min-w-[200px]">
        <div class="font-semibold">${props.name ?? 'Unnamed'}</div>
        <div class="text-sm text-gray-600">Difficulty: ${props.difficulty ?? 'n/a'}</div>
        <div class="text-sm text-gray-600">Length: ${props.length ?? 'n/a'} km</div>
      </div>
    `
    new mapboxgl.Popup({ closeButton: true })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map)
  })
}
```

---

### Style switching
Use `map.setStyle(styleUrl)`; re-add custom sources/layers on `style.load`.

```tsx
function switchStyle(map: mapboxgl.Map, styleUrl: string) {
  map.setStyle(styleUrl)
  map.once('style.load', () => {
    addHikingLayers(map)
    // Re-hydrate data if needed
  })
}
```

---

### Camera controls
- Programmatic moves: `map.jumpTo`, `map.easeTo`, `map.flyTo`
- Common options: `center`, `zoom`, `bearing`, `pitch`, `duration`

```tsx
function flyToFeature(map: mapboxgl.Map, feature: GeoJSON.Feature) {
  const center = feature?.bbox
    ? [(feature.bbox[0] + feature.bbox[2]) / 2, (feature.bbox[1] + feature.bbox[3]) / 2]
    : (map.getCenter().toArray() as [number, number])
  map.flyTo({ center, zoom: 12, essential: true })
}
```

---

### Expressions and color ramps
Use style expressions for data-driven rendering. See API docs for `interpolate`, `step`, `match`.

```json
[
  "interpolate", ["linear"], ["get", "length"],
  0, "#60a5fa",
  10, "#22c55e",
  30, "#f59e0b",
  60, "#ef4444"
]
```

---

### Performance tips
- Prefer GeoJSON vector subsets per viewport (use `in_bbox`).
- Debounce `moveend` data fetches if needed.
- Reuse sources; call `setData` instead of removing/adding layers.
- Limit `queryRenderedFeatures` to needed layers.

---

### Error handling & troubleshooting
- Listen for `error` events: `map.on('error', (e) => console.error(e.error))`.
- If layers disappear after style change, ensure `style.load` re-adds them.
- CORS: backend must allow frontend origin.

---

### Checklist for integrating a new map view
1) Ensure `VITE_MAPBOX_TOKEN` is set.
2) Initialize `mapboxgl.Map` with desired style and projection.
3) Add sources and layers (`routes`, `ways`).
4) Load data for viewport on `load` and `moveend`.
5) Wire interactions (hover, click, popup).
6) Optionally add style switching and camera helpers.

---

### Further reading
- Guides: [`https://docs.mapbox.com/mapbox-gl-js/guides/`](https://docs.mapbox.com/mapbox-gl-js/guides/)
- Getting started / install: [`https://docs.mapbox.com/mapbox-gl-js/guides/install/`](https://docs.mapbox.com/mapbox-gl-js/guides/install/)
- API reference: [`https://docs.mapbox.com/mapbox-gl-js/api/`](https://docs.mapbox.com/mapbox-gl-js/api/)


