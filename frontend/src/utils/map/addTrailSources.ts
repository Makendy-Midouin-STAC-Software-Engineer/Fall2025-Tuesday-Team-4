import type { Map } from 'mapbox-gl'

export const ROUTES_SOURCE_ID = 'routes'
export const WAYS_SOURCE_ID = 'ways'

export function addTrailSources(map: Map) {
  if (!map.getSource(ROUTES_SOURCE_ID)) {
    map.addSource(ROUTES_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, generateId: true } as any)
  }
  if (!map.getSource(WAYS_SOURCE_ID)) {
    map.addSource(WAYS_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, generateId: true } as any)
  }
}


