import { liteClient as algoliasearch } from 'algoliasearch/lite'

const appId = (import.meta as any).env?.VITE_ALGOLIA_APP_ID as string | undefined
const searchKey = (import.meta as any).env?.VITE_ALGOLIA_SEARCH_KEY as string | undefined
export const indexName = ((import.meta as any).env?.VITE_ALGOLIA_INDEX_NAME as string | undefined) || 'US_Routes_Ways'

if (!appId || !searchKey) {
  // Fail fast with a clear message if env is missing
  // eslint-disable-next-line no-console
  console.warn('[Algolia] Missing VITE_ALGOLIA_APP_ID or VITE_ALGOLIA_SEARCH_KEY. Add them to your .env')
}

export const searchClient = algoliasearch(appId || '', searchKey || '')

interface TrailHitCoordinate {
  lng?: number | string
  lon?: number | string
  lat?: number | string
}

export interface TrailHit {
  osm_id: string | number
  name?: string
  type?: string
  region?: string
  lengthKm?: number | null
  difficulty?: string | null
  website?: string | null
  center?: TrailHitCoordinate | [number, number] | null
  midpoint?: TrailHitCoordinate | [number, number] | null
  bbox?: [number, number, number, number] | null // [minX, minY, maxX, maxY]
}


