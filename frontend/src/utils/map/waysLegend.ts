import type { Map as MapboxMap } from 'mapbox-gl'

import { WAYS_LAYER_ID } from '@/utils/map/addTrailLayers'
import { lengthKmExpression } from '@/utils/map/trailColoring'

export interface WaysLegendBucket {
  label: string
  color: string
  minKm: number | null
  maxKm: number | null
}

export const WAYS_LEGEND_BUCKETS: WaysLegendBucket[] = [
  { label: '0 – 1 km', color: '#8BC34A', minKm: 0, maxKm: 1 },
  { label: '1 – 3 km', color: '#FFD54F', minKm: 1, maxKm: 3 },
  { label: '3 – 6 km', color: '#FFB347', minKm: 3, maxKm: 6 },
  { label: '6 – 10 km', color: '#FF7043', minKm: 6, maxKm: 10 },
  { label: '10+ km', color: '#E53935', minKm: 10, maxKm: null },
]

export function applyWaysLegendFilter(map: MapboxMap, selections: boolean[], showWays: boolean) {
  if (!map.getLayer(WAYS_LAYER_ID)) return
  if (!showWays) {
    try { map.setFilter(WAYS_LAYER_ID, null as any) } catch {}
    return
  }

  const filters = WAYS_LEGEND_BUCKETS
    .map((bucket, index) => (selections[index] ? bucketFilter(bucket) : null))
    .filter(Boolean) as any[]

  try {
    if (!filters.length) {
      map.setFilter(WAYS_LAYER_ID, ['==', 1, 0] as any)
    } else {
      map.setFilter(WAYS_LAYER_ID, ['any', ...filters] as any)
    }
  } catch {}
}

export function bucketFilter(bucket: WaysLegendBucket): any[] {
  const clauses: any[] = []
  const lengthExpr = lengthKmExpression()
  if (typeof bucket.minKm === 'number') clauses.push(['>=', lengthExpr, bucket.minKm])
  if (typeof bucket.maxKm === 'number') clauses.push(['<', lengthExpr, bucket.maxKm])
  if (!clauses.length) return ['>=', lengthExpr, 0]
  return ['all', ...clauses]
}

