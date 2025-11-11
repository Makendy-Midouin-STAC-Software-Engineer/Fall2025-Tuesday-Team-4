import type { Map as MapboxMap, MapboxGeoJSONFeature } from 'mapbox-gl'
import { ROUTES_SOURCE_LAYER, WAYS_SOURCE_LAYER, ID_PROP } from '@/utils/map/vectorTileConfig'
import type { TrailSummary } from '@/types/trail'

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

function toNumber(val: unknown): number | null {
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'string') {
    const parsed = Number(val)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function isFeatureRoute(f: MapboxGeoJSONFeature): boolean {
  return (f.layer?.id || '').includes('Route')
}

function getFeatureId(f: MapboxGeoJSONFeature): string | number | null {
  const raw = (f.properties?.[ID_PROP] as unknown) ?? (f.id as unknown)
  if (typeof raw === 'string' || typeof raw === 'number') return raw
  return null
}

export function featureToTrailSummary(f: MapboxGeoJSONFeature): TrailSummary | null {
  const id = getFeatureId(f)
  if (id == null) return null
  const props = (f.properties || {}) as Record<string, any>

  const lengthDirectKm = toNumber(props.length_km ?? props.lengthKm)
  const lengthMeters = toNumber(props.length_m ?? props.lengthMeters)
  const lengthFallback = toNumber(props.length)
  const lengthKm = lengthDirectKm ?? (lengthMeters != null ? lengthMeters / 1000 : null) ?? lengthFallback

  const difficulty = typeof props.difficulty === 'string' ? props.difficulty : null
  const website = typeof props.website === 'string' ? props.website : null
  const name = typeof props.name === 'string' ? props.name : null
  const type: 'Route' | 'Way' = isFeatureRoute(f) ? 'Route' : 'Way'

  return { id, name, type, lengthKm, difficulty, website }
}

export function flyToFeature(map: MapboxMap, f: MapboxGeoJSONFeature, minZoom = 8) {
  try {
    const geometryCoords = (f.geometry as any)?.coordinates
    if (!Array.isArray(geometryCoords)) return
    const flattened = geometryCoords.flat(2) as number[]
    if (!Array.isArray(flattened) || flattened.length < 2) return

    const [minx, miny, maxx, maxy] = flattened.reduce<[number, number, number, number]>((acc, value, index) => {
      if (index % 2 === 0) {
        acc[0] = Math.min(acc[0], value)
        acc[2] = Math.max(acc[2], value)
      } else {
        acc[1] = Math.min(acc[1], value)
        acc[3] = Math.max(acc[3], value)
      }
      return acc
    }, [Infinity, Infinity, -Infinity, -Infinity])

    if (!Number.isFinite(minx) || !Number.isFinite(miny) || !Number.isFinite(maxx) || !Number.isFinite(maxy)) return

    const centerLng = (minx + maxx) / 2
    const centerLat = (miny + maxy) / 2
    const currentZoom = map.getZoom()
    const targetZoom = currentZoom >= minZoom ? currentZoom : minZoom
    map.flyTo({ center: [centerLng, centerLat] as any, zoom: targetZoom, duration: 1000, essential: true })
  } catch {}
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

export function wireClickSelection(map: MapboxMap, onSelect: (trail: TrailSummary | null) => void) {
  const targetLayers = ['Ways', 'Route']

  map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point, { layers: targetLayers }) as MapboxGeoJSONFeature[]

    // Clicked off-trail: clear selection and close popup
    if (!features.length) {
      onSelect(null)
      return
    }

    const f = features[0]
    const summary = featureToTrailSummary(f)
    if (!summary) { onSelect(null); return }
    onSelect(summary)
    flyToFeature(map, f, 8)
  })
}

export function syncSelectionFilter(map: MapboxMap, selectedId: string | number | null) {
  const filter = selectedId != null
    ? ['==', ['coalesce', ['get', ID_PROP], ['id']], selectedId]
    : ['==', ['coalesce', ['get', ID_PROP], ['id']], -1]
  try {
    if (map.getLayer('Ways-selected')) map.setFilter('Ways-selected', filter as any)
    if (map.getLayer('Route-selected')) map.setFilter('Route-selected', filter as any)
  } catch {}
}

export function addZoomDependentStyling(_map: MapboxMap) {
  // Placeholder for future zoom-dependent styling hooks
}


