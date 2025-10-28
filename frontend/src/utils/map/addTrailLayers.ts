import type { Map as MapboxMap, AnyLayer } from 'mapbox-gl'
import { isDarkStyle, routeWidthExpression, routeHaloWidthExpression, waysWidthExpression, waysColorStepExpression } from '@/utils/map/trailColoring'
import { ROUTES_SOURCE_ID, WAYS_SOURCE_ID } from '@/utils/map/addTrailSources'

export const ROUTE_LAYER_ID = 'Route'
export const ROUTE_HALO_LAYER_ID = 'Route-halo'
export const WAYS_LAYER_ID = 'Ways'

export function addTrailLayers(
  map: MapboxMap,
  options: { routesVisible: boolean; waysVisible: boolean; styleUrl: string; widthScale: number }
) {
  const { routesVisible, waysVisible, styleUrl, widthScale } = options
  const dark = isDarkStyle(styleUrl)

  // Insert our line layers just beneath the topmost symbol layer,
  // so labels remain above trails for all base styles.
  const style = map.getStyle()
  const layers = style?.layers ?? []
  let beforeId: string | undefined
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].type === 'symbol') { beforeId = layers[i].id; break }
  }

  if (!map.getLayer(ROUTE_HALO_LAYER_ID)) {
    const spec = {
      id: ROUTE_HALO_LAYER_ID,
      type: 'line',
      source: ROUTES_SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': dark && routesVisible ? 'visible' : 'none',
      },
      paint: {
        'line-color': '#ffffff',
        'line-opacity': 0.25,
        'line-blur': 2,
        'line-width': routeHaloWidthExpression(widthScale) as any,
        'line-emissive-strength': 0 as any,
      },
    } as AnyLayer
    if (beforeId) map.addLayer(spec, beforeId); else map.addLayer(spec)
  } else {
    map.setLayoutProperty(ROUTE_HALO_LAYER_ID, 'visibility', dark && routesVisible ? 'visible' : 'none')
    map.setPaintProperty(ROUTE_HALO_LAYER_ID, 'line-width', routeHaloWidthExpression(widthScale) as any)
    map.setPaintProperty(ROUTE_HALO_LAYER_ID, 'line-emissive-strength', 0 as any)
  }

  if (!map.getLayer(ROUTE_LAYER_ID)) {
    const spec = {
      id: ROUTE_LAYER_ID,
      type: 'line',
      source: ROUTES_SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': routesVisible ? 'visible' : 'none',
      },
      paint: {
        'line-color': ['coalesce', ['get', 'routeColor'], '#3B82F6'] as any,
        'line-opacity': 0.8,
        'line-width': routeWidthExpression(widthScale) as any,
        'line-emissive-strength': 1.0 as any,
      },
    } as AnyLayer
    if (beforeId) map.addLayer(spec, beforeId); else map.addLayer(spec)
  } else {
    map.setLayoutProperty(ROUTE_LAYER_ID, 'visibility', routesVisible ? 'visible' : 'none')
    map.setPaintProperty(ROUTE_LAYER_ID, 'line-opacity', 0.8)
    map.setPaintProperty(ROUTE_LAYER_ID, 'line-width', routeWidthExpression(widthScale) as any)
    map.setPaintProperty(ROUTE_LAYER_ID, 'line-emissive-strength', 1.0 as any)
  }

  const waysOpacity = dark ? 1.0 : 1.0
  const waysColorExpr: any[] = waysColorStepExpression(styleUrl)
  if (!map.getLayer(WAYS_LAYER_ID)) {
    const spec = {
      id: WAYS_LAYER_ID,
      type: 'line',
      source: WAYS_SOURCE_ID,
      layout: {
        'line-join': 'round',
        'line-cap': 'round',
        'visibility': waysVisible ? 'visible' : 'none',
      },
      paint: {
        'line-color': waysColorExpr as any,
        'line-opacity': waysOpacity,
        'line-width': waysWidthExpression(widthScale) as any,
        'line-emissive-strength': 1 as any,
      },
    } as AnyLayer
    if (beforeId) map.addLayer(spec, beforeId); else map.addLayer(spec)
  } else {
    map.setLayoutProperty(WAYS_LAYER_ID, 'visibility', waysVisible ? 'visible' : 'none')
    map.setPaintProperty(WAYS_LAYER_ID, 'line-color', waysColorExpr as any)
    map.setPaintProperty(WAYS_LAYER_ID, 'line-opacity', waysOpacity)
    map.setPaintProperty(WAYS_LAYER_ID, 'line-width', waysWidthExpression(widthScale) as any)
    map.setPaintProperty(WAYS_LAYER_ID, 'line-emissive-strength', 1 as any)
  }

  try {
    if (beforeId) {
      if (map.getLayer(ROUTE_HALO_LAYER_ID)) map.moveLayer(ROUTE_HALO_LAYER_ID, beforeId)
      if (map.getLayer(ROUTE_LAYER_ID)) map.moveLayer(ROUTE_LAYER_ID, beforeId)
      if (map.getLayer(WAYS_LAYER_ID)) map.moveLayer(WAYS_LAYER_ID, beforeId)
    } else {
      // Fallback: move to top in correct relative order
      if (map.getLayer(ROUTE_HALO_LAYER_ID)) map.moveLayer(ROUTE_HALO_LAYER_ID)
      if (map.getLayer(ROUTE_LAYER_ID)) map.moveLayer(ROUTE_LAYER_ID)
      if (map.getLayer(WAYS_LAYER_ID)) map.moveLayer(WAYS_LAYER_ID)
    }
  } catch {}
}


