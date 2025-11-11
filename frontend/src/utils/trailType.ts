export function normalizeTrailType(rawType?: string | null): 'Route' | 'Way' {
  if (!rawType) return 'Way'
  const trimmed = rawType.trim()
  if (!trimmed) return 'Way'
  const lower = trimmed.toLowerCase()
  if (lower === 'route') return 'Route'
  if (lower === 'way') return 'Way'
  return 'Way'
}

export function getTrailTypeTag(rawType?: string | null): { label: string; variant: 'route' | 'way' | 'other' } {
  const trimmed = rawType?.trim()
  if (!trimmed) return { label: 'WAY', variant: 'way' }
  const lower = trimmed.toLowerCase()
  if (lower === 'route') return { label: 'ROUTE', variant: 'route' }
  if (lower === 'way') return { label: 'WAY', variant: 'way' }
  return { label: trimmed.toUpperCase(), variant: 'other' }
}


