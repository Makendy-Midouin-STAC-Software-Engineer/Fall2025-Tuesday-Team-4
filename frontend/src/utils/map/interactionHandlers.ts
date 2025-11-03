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
    const props = (f.properties || {}) as Record<string, any>
    const id = (props[ID_PROP] as number | string | undefined) ?? (f.id as number | string | undefined)
    if (id == null) {
      onSelect(null)
      return
    }

    const toNumber = (val: unknown): number | null => {
      if (typeof val === 'number' && Number.isFinite(val)) return val
      if (typeof val === 'string') {
        const parsed = Number(val)
        if (Number.isFinite(parsed)) return parsed
      }
      return null
    }

    const lengthDirectKm = toNumber(props.length_km ?? props.lengthKm)
    const lengthMeters = toNumber(props.length_m ?? props.lengthMeters)
    const lengthFallback = toNumber(props.length)
    const lengthKm = lengthDirectKm ?? (lengthMeters != null ? lengthMeters / 1000 : null) ?? lengthFallback

    const difficulty = typeof props.difficulty === 'string' ? props.difficulty : null
    const website = typeof props.website === 'string' ? props.website : null
    const name = typeof props.name === 'string' ? props.name : null
    const type: 'Route' | 'Way' = (f.layer?.id || '').includes('Route') ? 'Route' : 'Way'

    const summary: TrailSummary = {
      id,
      name,
      type,
      lengthKm,
      difficulty,
      website,
    }

    onSelect(summary)

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


