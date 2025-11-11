import type { Map as MapboxMap, MapboxGeoJSONFeature } from 'mapbox-gl'
import { syncSelectionFilter } from '@/utils/map/interactionHandlers'
import { ROUTES_SOURCE_LAYER, WAYS_SOURCE_LAYER, ID_PROP } from '@/utils/map/vectorTileConfig'
import type { TrailHit } from '@/lib/algoliaClient'

function computeBboxFromFeatures(features: MapboxGeoJSONFeature[]): [number, number, number, number] | null {
  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity
  for (const f of features) {
    const coords = (f.geometry as any)?.coordinates
    if (!Array.isArray(coords)) continue
    const flat = coords.flat(2) as number[]
    for (let i = 0; i + 1 < flat.length; i += 2) {
      const x = flat[i]
      const y = flat[i + 1]
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      if (x < minx) minx = x
      if (y < miny) miny = y
      if (x > maxx) maxx = x
      if (y > maxy) maxy = y
    }
  }
  if (!Number.isFinite(minx) || !Number.isFinite(miny) || !Number.isFinite(maxx) || !Number.isFinite(maxy)) return null
  return [minx, miny, maxx, maxy]
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function resolveCoordinate(value: unknown): { lng: number; lat: number } | null {
  if (!value) return null
  if (Array.isArray(value) && value.length >= 2) {
    const lon = toFiniteNumber(value[0])
    const lat = toFiniteNumber(value[1])
    if (lon !== null && lat !== null) return { lng: lon, lat }
    return null
  }
  if (typeof value === 'object') {
    const candidate = value as { lng?: unknown; lon?: unknown; lat?: unknown }
    const lon = toFiniteNumber(candidate.lng ?? candidate.lon)
    const lat = toFiniteNumber(candidate.lat)
    if (lon !== null && lat !== null) return { lng: lon, lat }
  }
  return null
}

export function focusTrailByOsmId(map: MapboxMap, hit: TrailHit, options?: { minZoom?: number }) {
  const selectedId = hit.osm_id
  syncSelectionFilter(map, selectedId as any)

  // Prefer bbox if present
  if (hit.bbox && hit.bbox.length === 4 && hit.bbox.every((v) => Number.isFinite(v))) {
    try { map.fitBounds([[hit.bbox[0], hit.bbox[1]], [hit.bbox[2], hit.bbox[3]]] as any, { padding: 40, duration: 800 }) } catch {}
    return
  }

  const center = resolveCoordinate(hit.center as any)
  const midpoint = resolveCoordinate(hit.midpoint as any)
  const resolved = center ?? midpoint

  // Fall back to provided center/midpoint coordinates
  if (resolved) {
    const minZoom = options?.minZoom ?? 8
    const targetZoom = Math.max(map.getZoom(), minZoom)
    try { map.flyTo({ center: [resolved.lng, resolved.lat] as any, zoom: targetZoom, duration: 800, essential: true }) } catch {}
    return
  }

  // Last resort: try to locate features by id in sources
  try {
    const filter = ['==', ['coalesce', ['get', ID_PROP], ['id']], selectedId] as any
    const routes = map.querySourceFeatures('routes', { sourceLayer: ROUTES_SOURCE_LAYER as any, filter }) as MapboxGeoJSONFeature[]
    const ways = map.querySourceFeatures('ways', { sourceLayer: WAYS_SOURCE_LAYER as any, filter }) as MapboxGeoJSONFeature[]
    const bbox = computeBboxFromFeatures([...routes, ...ways])
    if (bbox) {
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]] as any, { padding: 40, duration: 800 })
    }
  } catch {}
}


