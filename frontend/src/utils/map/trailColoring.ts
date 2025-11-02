// Color utilities and palettes for routes and ways

export const DARK_STYLE = 'mapbox://styles/ultimateboss/cmgsd44fu00cb01qo5wsjehsu'
export const OUTDOORS_STYLE = 'mapbox://styles/mapbox/outdoors-v12'

const ROUTE_PALETTE = [
  '#3B82F6', // blue
  '#10B981', // emerald
  '#F59E0B', // amber
  '#EF4444', // soft red
  '#8B5CF6', // violet
  '#F472B6', // rose
  '#14B8A6', // teal
  '#84CC16', // lime
]

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)) }

function brightenHexBy(hex: string, amount: number): string {
  const a = clamp01(amount)
  const normalized = hex.replace('#', '')
  const bigint = parseInt(normalized.length === 3
    ? normalized.split('').map(c => c + c).join('')
    : normalized, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  const nr = Math.round(r + (255 - r) * a)
  const ng = Math.round(g + (255 - g) * a)
  const nb = Math.round(b + (255 - b) * a)
  const toHex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`
}

export function isDarkStyle(url: string): boolean {
  if (!url) return false
  const u = url.toLowerCase()
  return u.includes('dark') || url === DARK_STYLE
}

function hashStringToInt(input: string): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) hash = ((hash << 5) + hash) + input.charCodeAt(i)
  return Math.abs(hash)
}

export function getRouteColor(nameRaw: string | unknown, baseStyle: string): string {
  const name = (typeof nameRaw === 'string' && nameRaw.trim().length > 0) ? nameRaw.trim() : 'route'
  const idx = hashStringToInt(name) % ROUTE_PALETTE.length
  const base = ROUTE_PALETTE[idx]
  return isDarkStyle(baseStyle) ? brightenHexBy(base, 0.2) : base
}

export function getWayColor(lengthKm: number, baseStyle: string): string {
  // Approximate 5 buckets by length
  const baseStops = ['#A8E6A3', '#C7E98D', '#FFD76A', '#FFB347', '#FF6961']
  const darkAdjust = isDarkStyle(baseStyle)
  const stops = darkAdjust ? baseStops.map(c => brightenHexBy(c, 0.18)) : baseStops
  if (lengthKm < 1) return stops[0]
  if (lengthKm < 3) return stops[1]
  if (lengthKm < 6) return stops[2]
  if (lengthKm < 10) return stops[3]
  return stops[4]
}

// Base width stops for readability
const WAYS_WIDTH_STOPS: Array<[number, number]> = [
  [5, 1.5],
  [12, 2.5],
  [16, 3.0],
]

const ROUTE_WIDTH_STOPS: Array<[number, number]> = [
  [5, 3],
  [12, 3.5],
  [16, 4],
]

export function waysBaseWidthExpression(): any[] {
  return ['interpolate', ['linear'], ['zoom'], ...WAYS_WIDTH_STOPS.flat()]
}

export function routeBaseWidthExpression(): any[] {
  return ['interpolate', ['linear'], ['zoom'], ...ROUTE_WIDTH_STOPS.flat()]
}

// Width expressions that keep ['zoom'] at the top level while applying a scale factor
export function waysWidthExpression(scale: number): any[] {
  return [
    'interpolate', ['linear'], ['zoom'],
    ...WAYS_WIDTH_STOPS.flatMap(([z, w]) => [z, w * scale]),
  ]
}

export function routeWidthExpression(scale: number): any[] {
  return [
    'interpolate', ['linear'], ['zoom'],
    ...ROUTE_WIDTH_STOPS.flatMap(([z, w]) => [z, w * scale]),
  ]
}

export function routeHaloWidthExpression(scale: number): any[] {
  // Halo is base route width + 2px, then scaled
  return [
    'interpolate', ['linear'], ['zoom'],
    ...ROUTE_WIDTH_STOPS.flatMap(([z, w]) => [z, (w + 2) * scale]),
  ]
}

// Ways color expression (step) with optional dark-style brightening
export function waysColorStepExpression(styleUrl: string): any[] {
  const baseStops = ['#A8E6A3', '#C7E98D', '#FFD76A', '#FFB347', '#FF6961']
  const dark = isDarkStyle(styleUrl)
  const stops = dark ? baseStops.map(c => brightenHexBy(c, 0.18)) : baseStops
  // Compute length in km without relying on property-existence operators.
  // Using max of candidate numeric values avoids coalescing nulls to 0 prematurely
  // while staying expression-compatible across Mapbox versions.
  const lengthKm: any[] = [
    'max',
    ['max', ['to-number', ['get', 'length_km']], ['/', ['to-number', ['get', 'length_m']], 1000]],
    ['to-number', ['get', 'length']],
  ]
  return ['step', lengthKm, stops[0], 1, stops[1], 3, stops[2], 6, stops[3], 10, stops[4]]
}

// Deterministic route color based on a numeric feature identifier.
// Uses modulo over the ROUTE_PALETTE length to map ids -> stable colors.
// We use 'osm_id' from the tiles. If missing or non-numeric, fallback to 0.
import { ID_PROP } from '@/utils/map/vectorTileConfig'

export function routeColorByIdExpression(): any[] {
  const palette = ROUTE_PALETTE
  const paletteLen = palette.length
  // Build a match expression on (to-number(osm_id) % paletteLen)
  const cases: any[] = []
  for (let i = 0; i < paletteLen; i++) { cases.push(i, palette[i]) }
  return [
    'match',
    ['%', ['coalesce', ['to-number', ['get', ID_PROP]], 0], paletteLen],
    ...cases,
    palette[paletteLen - 1],
  ] as any
}


