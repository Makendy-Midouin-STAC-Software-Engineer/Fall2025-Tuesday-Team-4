import type { Map as MapboxMap } from 'mapbox-gl'
import { isDarkStyle } from '@/utils/map/trailColoring'
import { ROUTE_HALO_LAYER_ID, ROUTE_LAYER_ID, WAYS_LAYER_ID, addTrailLayers } from '@/utils/map/addTrailLayers'
import { addTrailSources } from '@/utils/map/addTrailSources'

export function updateBaseStyle(map: MapboxMap, nextStyleUrl: string, options: { routesVisible: boolean; waysVisible: boolean; widthScale: number }) {
  const center = map.getCenter()
  const zoom = map.getZoom()
  const bearing = map.getBearing()
  const pitch = map.getPitch()
  map.setStyle(nextStyleUrl)
  map.once('style.load', () => {
    map.jumpTo({ center, zoom, bearing, pitch })
    // Re-add DEM and terrain on style changes
    try {
      if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        } as any)
      }
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 } as any)
    } catch {}
    addTrailSources(map)
    addTrailLayers(map, { routesVisible: options.routesVisible, waysVisible: options.waysVisible, styleUrl: nextStyleUrl, widthScale: options.widthScale })
    try {
      map.setLayoutProperty(ROUTE_LAYER_ID, 'visibility', options.routesVisible ? 'visible' : 'none')
      if (map.getLayer(ROUTE_HALO_LAYER_ID)) map.setLayoutProperty(ROUTE_HALO_LAYER_ID, 'visibility', isDarkStyle(nextStyleUrl) && options.routesVisible ? 'visible' : 'none')
      map.setLayoutProperty(WAYS_LAYER_ID, 'visibility', options.waysVisible ? 'visible' : 'none')
    } catch {}
  })
}


