import mapboxgl, { type MapboxOptions } from 'mapbox-gl'

export function initMap(container: HTMLDivElement, styleUrl: string, options?: Partial<MapboxOptions>) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('Missing VITE_MAPBOX_TOKEN in environment')
    throw new Error('Missing Mapbox token')
  }
  mapboxgl.accessToken = token

  const map = new mapboxgl.Map({
    container,
    style: styleUrl,
    attributionControl: true,
    cooperativeGestures: false,
    ...options,
  })

  // Basic navigation controls
  map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right')
  // Enable 3D terrain source (Mapbox DEM) if not present
  map.on('style.load', () => {
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
  })
  return map
}

export function attachResizeHandlers(map: mapboxgl.Map, container: HTMLDivElement) {
  const handleResize = () => map.resize()
  window.addEventListener('resize', handleResize)
  let resizeObserver: ResizeObserver | null = null
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => handleResize())
    resizeObserver.observe(container)
  }
  return () => {
    window.removeEventListener('resize', handleResize)
    try { resizeObserver?.disconnect() } catch {}
  }
}


