import type { Map as MapboxMap } from 'mapbox-gl'
import type { RegionMeta } from './regionsMeta'
import { regionSourceId } from './regionsSource'

const HALO_SUFFIX = 'halo'

export function ensureRegionOutlineLayer(map: MapboxMap, meta: RegionMeta) {
  const sourceId = regionSourceId(meta.id)
  const lineLayerId = outlineLayerId(meta.id)
  const haloLayerId = outlineHaloLayerId(meta.id)

  const beforeId = pickBeforeId(map)

  if (!map.getLayer(haloLayerId)) {
    const spec = {
      id: haloLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round', visibility: 'visible' },
      paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.55 },
    } as any
    if (beforeId) map.addLayer(spec, beforeId); else map.addLayer(spec)
  }

  if (!map.getLayer(lineLayerId)) {
    const spec = {
      id: lineLayerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round', visibility: 'visible' },
      paint: { 'line-color': meta.color as any, 'line-width': 4, 'line-opacity': 1, 'line-emissive-strength': 1 as any },
    } as any
    if (beforeId) map.addLayer(spec, beforeId); else map.addLayer(spec)
  }

  // Ensure relative ordering: halo below line
  try {
    if (map.getLayer(haloLayerId)) map.moveLayer(haloLayerId)
    if (map.getLayer(lineLayerId)) map.moveLayer(lineLayerId)
  } catch {}
}

export function setRegionVisibility(map: MapboxMap, regionId: string, visible: boolean) {
  const ids = [outlineHaloLayerId(regionId), outlineLayerId(regionId)]
  for (const id of ids) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
  }
}

export function outlineLayerId(regionId: string): string { return `region-outline-${regionId}` }
export function outlineHaloLayerId(regionId: string): string { return `region-outline-${regionId}-${HALO_SUFFIX}` }

function pickBeforeId(map: MapboxMap): string | undefined {
  const candidateOrder = ['Ways', 'Route']
  for (const id of candidateOrder) if (map.getLayer(id)) return id
  const style = map.getStyle()
  const layers = style?.layers ?? []
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i].type === 'symbol') return layers[i].id
  }
  return undefined
}


