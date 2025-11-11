import type { Map as MapboxMap } from 'mapbox-gl'
import type { RegionMeta } from './regionsMeta'

export async function loadRegionGeoJSON(meta: RegionMeta): Promise<any | null> {
  try {
    const res = await fetch(`/regions/${meta.file}`)
    if (!res.ok) return null
    const data = await res.json()
    return data
  } catch {
    return null
  }
}

export function ensureRegionSource(map: MapboxMap, id: string, data: any) {
  const sourceId = regionSourceId(id)
  if (map.getSource(sourceId)) {
    try { (map.getSource(sourceId) as any).setData(data) } catch {}
    return
  }
  map.addSource(sourceId, { type: 'geojson', data } as any)
}

export function regionSourceId(regionId: string): string { return `region-src-${regionId}` }


