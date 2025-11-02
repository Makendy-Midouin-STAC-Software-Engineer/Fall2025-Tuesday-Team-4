import type { Map as MapboxMap, MapboxGeoJSONFeature, Popup } from 'mapbox-gl'
import mapboxgl from 'mapbox-gl'
import { ROUTES_SOURCE_LAYER, WAYS_SOURCE_LAYER, ID_PROP } from '@/utils/map/vectorTileConfig'

const HOVER_WAYS_LAYER_ID = 'Ways-hover'
const HOVER_ROUTE_LAYER_ID = 'Route-hover'
const SELECT_WAYS_LAYER_ID = 'Ways-selected'
const SELECT_ROUTE_LAYER_ID = 'Route-selected'

function coalesceIdExpr(): any[] { return ['coalesce', ['get', ID_PROP], ['id']] as any }

export function addHoverHighlight(map: MapboxMap) {
  // Ensure hover layers exist for both sources
  if (map.getSource('ways') && !map.getLayer(HOVER_WAYS_LAYER_ID)) {
    map.addLayer({
      id: HOVER_WAYS_LAYER_ID,
      type: 'line',
      source: 'ways',
      'source-layer': WAYS_SOURCE_LAYER as any,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.9,
        'line-width': 5,
        'line-emissive-strength': 1 as any,
      },
      filter: ['==', coalesceIdExpr(), -1],
    } as any)
  }
  if (map.getSource('routes') && !map.getLayer(HOVER_ROUTE_LAYER_ID)) {
    map.addLayer({
      id: HOVER_ROUTE_LAYER_ID,
      type: 'line',
      source: 'routes',
      'source-layer': ROUTES_SOURCE_LAYER as any,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.9,
        'line-width': 6,
        'line-emissive-strength': 1 as any,
      },
      filter: ['==', coalesceIdExpr(), -1],
    } as any)
  }

  const targetLayers = ['Ways', 'Route']

  map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: targetLayers }) as MapboxGeoJSONFeature[]
    if (!features.length) {
      map.setFilter(HOVER_WAYS_LAYER_ID, ['==', coalesceIdExpr(), -1])
      map.setFilter(HOVER_ROUTE_LAYER_ID, ['==', coalesceIdExpr(), -1])
      map.getCanvas().style.cursor = ''
      return
    }
    const f = features[0]
    const fid = (f.properties?.[ID_PROP] as number | string | undefined) ?? (f.id as number | string | undefined)
    if (fid == null) {
      map.setFilter(HOVER_WAYS_LAYER_ID, ['==', coalesceIdExpr(), -1])
      map.setFilter(HOVER_ROUTE_LAYER_ID, ['==', coalesceIdExpr(), -1])
      map.getCanvas().style.cursor = ''
      return
    }
    if ((f.layer?.id || '').includes('Route')) {
      map.setFilter(HOVER_ROUTE_LAYER_ID, ['==', coalesceIdExpr(), fid])
      map.setFilter(HOVER_WAYS_LAYER_ID, ['==', coalesceIdExpr(), -1])
    } else {
      map.setFilter(HOVER_WAYS_LAYER_ID, ['==', coalesceIdExpr(), fid])
      map.setFilter(HOVER_ROUTE_LAYER_ID, ['==', coalesceIdExpr(), -1])
    }
    map.getCanvas().style.cursor = 'pointer'
  })

  map.on('mouseleave', 'Ways', () => {
    map.setFilter(HOVER_WAYS_LAYER_ID, ['==', coalesceIdExpr(), -1])
    map.getCanvas().style.cursor = ''
  })
  map.on('mouseleave', 'Route', () => {
    map.setFilter(HOVER_ROUTE_LAYER_ID, ['==', coalesceIdExpr(), -1])
    map.getCanvas().style.cursor = ''
  })
}

export function ensureSelectionHighlightLayers(map: MapboxMap) {
  if (map.getSource('ways') && !map.getLayer(SELECT_WAYS_LAYER_ID)) {
    map.addLayer({
      id: SELECT_WAYS_LAYER_ID,
      type: 'line',
      source: 'ways',
      'source-layer': WAYS_SOURCE_LAYER as any,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#FFFFFF',  //34D399 //emarald 400  
        'line-opacity': 1.0,
        'line-width': 6,
        'line-emissive-strength': 1 as any,
      },
      filter: ['==', coalesceIdExpr(), -1],
    } as any)
  }
  if (map.getSource('routes') && !map.getLayer(SELECT_ROUTE_LAYER_ID)) {
    map.addLayer({
      id: SELECT_ROUTE_LAYER_ID,
      type: 'line',
      source: 'routes',
      'source-layer': ROUTES_SOURCE_LAYER as any,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#FFFFFF',  //34D399  //34D399 //emarald 400 
        'line-opacity': 1.0,
        'line-width': 7,
        'line-emissive-strength': 1 as any,
      },
      filter: ['==', coalesceIdExpr(), -1],
    } as any)
  }
}

export function addClickPopup(map: MapboxMap, _apiBase: string, onSelect: (id: number | string | null) => void) {
  const targetLayers = ['Ways', 'Route']
  let popup: Popup | null = null

  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: targetLayers }) as MapboxGeoJSONFeature[]

    // Clicked off-trail: clear selection and close popup
    if (!features.length) {
      onSelect(null)
      if (popup) { popup.remove(); popup = null }
      return
    }

    const f = features[0]
    const props = (f.properties || {}) as Record<string, any>
    const id = (props[ID_PROP] as number | string | undefined) ?? (f.id as number | string | undefined) ?? null
    const isRoute = (f.layer?.id || '').includes('Route')
    const kind = isRoute ? 'route' : 'ways'
    onSelect(id)

    // Simple fly-to center of geometry at fixed zoom for all trails
    try {
      const coords = (f.geometry as any)?.coordinates?.flat(2) as number[] | undefined
      if (Array.isArray(coords) && coords.length >= 2) {
        const [minx, miny, maxx, maxy] = coords.reduce<[number, number, number, number]>((acc, c, idx) => {
          if (idx % 2 === 0) { acc[0] = Math.min(acc[0], c); acc[2] = Math.max(acc[2], c) }
          else { acc[1] = Math.min(acc[1], c); acc[3] = Math.max(acc[3], c) }
          return acc
        }, [Infinity, Infinity, -Infinity, -Infinity])
        const cx = (minx + maxx) / 2
        const cy = (miny + maxy) / 2
        map.easeTo({ center: [cx, cy] as any, zoom: 10, duration: 800 })
      }
    } catch {}

    // Popup uses available tile properties (client-only)
    const initialName = props.name ?? 'N/A'
    const initialLength = props.length ?? props.length_km ?? (typeof props.length_m === 'number' ? (props.length_m / 1000).toFixed(2) : 'N/A')
    const initialDifficulty = props.difficulty ?? 'N/A'
    const initialRegion = props.region ?? props.location ?? 'N/A'
    const render = (name: any, length: any, difficulty: any, region: any) => `
      <div class="min-w-[220px] text-gray-900">
        <div class="mb-1 flex items-center gap-2">
          <div class="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"></div>
          <div class="font-semibold">${name}</div>
          <button id="ihike-popup-close" class="ml-auto rounded px-2 text-xs text-gray-500 hover:text-gray-700">×</button>
        </div>
        <div class="space-y-1 text-sm text-gray-700">
          <div><span class="text-gray-500">Length:</span> ${length} km</div>
          <div><span class="text-gray-500">Difficulty:</span> ${difficulty}</div>
          <div><span class="text-gray-500">Region:</span> ${region}</div>
        </div>
      </div>`

    if (popup) popup.remove()
    popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })
      .setLngLat(e.lngLat)
      .setHTML(render(initialName, initialLength, initialDifficulty, initialRegion))
      .addTo(map)

    // Close button: close popup and clear selection
    try {
      const btn = document.getElementById('ihike-popup-close')
      if (btn) (btn as HTMLButtonElement).onclick = () => { onSelect(null); popup?.remove(); popup = null }
    } catch {}

    // No backend hydration; tile properties are authoritative at click time
  })
}

export function addZoomDependentStyling(_map: MapboxMap) {
  // Placeholder for future zoom-dependent styling hooks
}


