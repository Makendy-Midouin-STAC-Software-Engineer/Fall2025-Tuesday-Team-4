import type { Map } from 'mapbox-gl'
import { ROUTES_TILESET, WAYS_TILESET } from '@/utils/map/vectorTileConfig'

export const ROUTES_SOURCE_ID = 'routes'
export const WAYS_SOURCE_ID = 'ways'

export function addTrailSources(map: Map) {
  // Register vector sources pointing at Mapbox-hosted tilesets.
  if (!map.getSource(ROUTES_SOURCE_ID)) {
    map.addSource(ROUTES_SOURCE_ID, { type: 'vector', url: ROUTES_TILESET } as any)
  }
  if (!map.getSource(WAYS_SOURCE_ID)) {
    map.addSource(WAYS_SOURCE_ID, { type: 'vector', url: WAYS_TILESET } as any)
  }
}


