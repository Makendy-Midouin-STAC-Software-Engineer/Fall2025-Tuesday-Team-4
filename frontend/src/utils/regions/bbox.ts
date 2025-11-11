export interface BBox { minX: number; minY: number; maxX: number; maxY: number }

export function computeGeoJsonBbox(geojson: any): BBox | null {
  try {
    const type = geojson?.type
    if (!type) return null
    const coords = collectCoordinates(geojson)
    if (!coords.length) return null
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (let i = 0; i < coords.length; i++) {
      const [x, y] = coords[i]
      if (typeof x !== 'number' || typeof y !== 'number') continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null
    return { minX, minY, maxX, maxY }
  } catch {
    return null
  }
}

function collectCoordinates(geojson: any): number[][] {
  const out: number[][] = []
  walk(geojson, (c) => out.push(c))
  return out
}

function walk(node: any, onCoord: (coord: number[]) => void) {
  if (!node) return
  const t = node.type
  if (t === 'FeatureCollection') {
    for (const f of node.features || []) walk(f, onCoord)
    return
  }
  if (t === 'Feature') { walk(node.geometry, onCoord); return }
  if (t === 'GeometryCollection') { for (const g of node.geometries || []) walk(g, onCoord); return }
  const coords = node.coordinates
  if (!coords) return
  visit(coords, onCoord)
}

function visit(arr: any, onCoord: (coord: number[]) => void) {
  if (!Array.isArray(arr)) return
  if (typeof arr[0] === 'number' && typeof arr[1] === 'number') { onCoord(arr as number[]); return }
  for (const child of arr) visit(child, onCoord)
}


