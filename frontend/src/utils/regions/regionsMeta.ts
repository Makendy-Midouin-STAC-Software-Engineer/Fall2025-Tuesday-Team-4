export type RegionId = 'northeast' | 'midwest' | 'south' | 'west' | 'alaska' | 'hawaii'

export interface RegionMeta {
  id: RegionId
  name: string
  file: string // relative to public/regions
  color: string
}

export const REGIONS: RegionMeta[] = [
  { id: 'northeast', name: 'Northeast', file: 'US_Northeast.geojson', color: '#6750A4' },
  { id: 'midwest', name: 'Midwest', file: 'US_Midwest.geojson', color: '#10B981' },
  { id: 'south', name: 'South', file: 'US_South.geojson', color: '#6366F1' },
  { id: 'west', name: 'West', file: 'US_West_cropped.json', color: '#F59E0B' },
  { id: 'alaska', name: 'Alaska', file: 'Alaska_Region.geojson', color: '#F43F5E' },
  { id: 'hawaii', name: 'Hawaii', file: 'Hawaii_Region.geojson', color: '#06B6D4' },
]

export function getRegionMeta(id: RegionId): RegionMeta | undefined {
  return REGIONS.find((r) => r.id === id)
}


