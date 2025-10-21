import { useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, LngLatLike, MapboxOptions, LngLatBounds, GeoJSONSource } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import { LayerToggles } from '@/components/map/LayerToggles'
import { initMap, attachResizeHandlers } from '@/utils/map/initMap'
import { updateBaseStyle } from '@/utils/map/updateBaseStyle'
import { addTrailSources } from '@/utils/map/addTrailSources'
import { addTrailLayers, ROUTE_HALO_LAYER_ID, ROUTE_LAYER_ID, WAYS_LAYER_ID } from '@/utils/map/addTrailLayers'
import { addHoverHighlight, addClickPopup, ensureSelectionHighlightLayers } from '@/utils/map/interactionHandlers'
import { DARK_STYLE, OUTDOORS_STYLE, getRouteColor, isDarkStyle, routeHaloWidthExpression, routeWidthExpression, waysWidthExpression } from '@/utils/map/trailColoring'

interface MapViewProps {
  initialCenter?: LngLatLike
  initialZoom?: number
}

const STORAGE_KEY = 'ihike-map-state-v1'

interface SavedMapState {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
  style: string
  showRoutes: boolean
  showWays: boolean
}

function loadSavedState(): SavedMapState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedMapState
  } catch {
    return null
  }
}

function initialStyleFromStorage(defaultStyle: string): string {
  const saved = loadSavedState()
  if (saved && (saved.style === DARK_STYLE || saved.style === OUTDOORS_STYLE)) return saved.style
  return defaultStyle
}

function initialTogglesFromStorage() {
  const saved = loadSavedState()
  return {
    showRoutes: saved?.showRoutes ?? true,
    showWays: saved?.showWays ?? true,
  }
}

function bboxParamFromMap(map: MapboxMap): string {
  const bounds = map.getBounds() as LngLatBounds
  return `in_bbox=${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`
}

function toFeatureCollection(input: unknown): GeoJSON.FeatureCollection {
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  function isValidGeometry(g: any): boolean {
    if (!g || typeof g !== 'object') return false
    if (typeof g.type !== 'string') return false
    return 'coordinates' in g
  }

  function isValidFeature(f: any): f is GeoJSON.Feature {
    return f && f.type === 'Feature' && isValidGeometry(f.geometry)
  }

  try {
    const v: any = input as any
    let features: unknown = []

    if (v && typeof v === 'object') {
      if (v.type === 'FeatureCollection' && Array.isArray(v.features)) features = v.features
      else if (v.results && v.results.type === 'FeatureCollection' && Array.isArray(v.results.features)) features = v.results.features
      else if (Array.isArray(v.results)) features = v.results
      else if (Array.isArray(v.features)) features = v.features
    }

    if (Array.isArray(features)) {
      const filtered = (features as unknown[]).filter(isValidFeature) as GeoJSON.Feature[]
      return { type: 'FeatureCollection', features: filtered }
    }
  } catch {}

  return empty
}

export function MapView({ initialCenter = [-122.447303, 37.753574], initialZoom = 10 }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const cleanupResizeRef = useRef<(() => void) | null>(null)
  const [styleUrl, setStyleUrl] = useState<string>(() => initialStyleFromStorage(DARK_STYLE))
  const [showRoutes, setShowRoutes] = useState<boolean>(() => initialTogglesFromStorage().showRoutes)
  const [showWays, setShowWays] = useState<boolean>(() => initialTogglesFromStorage().showWays)
  const [widthScale, setWidthScale] = useState<number>(1)
  const [affectRoutes, setAffectRoutes] = useState<boolean>(true)
  const [affectWays, setAffectWays] = useState<boolean>(true)
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1)
  const [selectedTrailId, setSelectedTrailId] = useState<string | number | null>(null)

  const envBase = import.meta.env.VITE_API_BASE_URL as string | undefined
  // Avoid mixed-content in production: if the page is served over HTTPS and
  // the configured API base is HTTP, fall back to a relative path (or localhost in dev)
  const isHttpsPage = typeof window !== 'undefined' && window.location.protocol === 'https:'
  const defaultBase = import.meta.env.DEV ? 'http://localhost:8000' : ''
  const shouldIgnoreEnvBase = isHttpsPage && !!envBase && envBase.startsWith('http://')
  const API_BASE: string = shouldIgnoreEnvBase ? defaultBase : (envBase ?? defaultBase)

  async function fetchViewportData(map: MapboxMap): Promise<void> {
    try {
      const routesUrl = `${API_BASE}/api/route/?${bboxParamFromMap(map)}&page_size=5000`
      const waysUrl = `${API_BASE}/api/ways/?${bboxParamFromMap(map)}&page_size=5000`
      const common: RequestInit = { headers: { Accept: 'application/geo+json, application/json;q=0.9' } }

      async function fetchAllPages(startUrl: string): Promise<GeoJSON.FeatureCollection> {
        let url: string | null = startUrl
        const all: GeoJSON.Feature[] = []
        while (url) {
          const res = await fetch(url, common)
          if (!res.ok) break
          const data = await res.json()
          const fc = toFeatureCollection(data)
          all.push(...fc.features)
          url = (data && typeof data === 'object' && 'next' in data) ? (data.next as string | null) : null
        }
        return { type: 'FeatureCollection', features: all }
      }

      const [routes, ways] = await Promise.all([
        fetchAllPages(routesUrl),
        fetchAllPages(waysUrl),
      ])

      const coloredRoutes: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: routes.features.map((f) => {
          const name = (f.properties as any)?.name
          const color = getRouteColor(name, styleUrl)
          return { ...f, properties: { ...(f.properties || {}), routeColor: color } }
        }),
      }

      const routesSrc = map.getSource('routes') as GeoJSONSource
      if (routesSrc) routesSrc.setData(coloredRoutes)
      const waysSrc = map.getSource('ways') as GeoJSONSource
      if (waysSrc) waysSrc.setData(ways)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load data', err)
    }
  }

  useEffect(() => {
    if (!containerRef.current) return
    if (mapRef.current) return

    const saved = loadSavedState()

    const options: Partial<MapboxOptions> = {
      style: styleUrl,
      center: (saved?.center ?? initialCenter) as LngLatLike,
      zoom: saved?.zoom ?? initialZoom,
      bearing: saved?.bearing ?? 0,
      pitch: saved?.pitch ?? 0,
      attributionControl: true,
      cooperativeGestures: false,
    }

    let map: MapboxMap
    try {
      map = initMap(containerRef.current, styleUrl, options)
    } catch {
      return
    }
    mapRef.current = map

    // Resize handling
    cleanupResizeRef.current = attachResizeHandlers(map, containerRef.current)

    const saveState = () => {
      try {
        const c = map.getCenter().toArray() as [number, number]
        const state: SavedMapState = {
          center: c,
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          style: styleUrl,
          showRoutes,
          showWays,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {}
    }

    const loadDataForViewport = () => fetchViewportData(map)

    map.on('load', () => {
      addTrailSources(map)
      addTrailLayers(map, { routesVisible: showRoutes, waysVisible: showWays, styleUrl, widthScale })
      // Apply interactions
      addHoverHighlight(map)
      ensureSelectionHighlightLayers(map)
      addClickPopup(map, API_BASE, (id) => setSelectedTrailId(id))
      loadDataForViewport()
      saveState()
    })

    map.on('moveend', saveState)
    map.on('zoomend', saveState)
    map.on('rotateend', saveState)
    map.on('pitchend', saveState)
    map.on('moveend', loadDataForViewport)
    map.on('zoomend', loadDataForViewport)

    map.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('Mapbox error', e.error?.message ? e.error : e)
    })

    return () => {
      try { cleanupResizeRef.current?.() } catch {}
      map.remove()
      mapRef.current = null
    }
  }, [])

  // Style switch effect
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    updateBaseStyle(map, styleUrl, { routesVisible: showRoutes, waysVisible: showWays, widthScale })
    map.once('style.load', () => {
      // Re-wire interactions after style swap
      addHoverHighlight(map)
      ensureSelectionHighlightLayers(map)
      addClickPopup(map, API_BASE, (id) => setSelectedTrailId(id))
      // Re-apply selection filter
      try {
        const filter = selectedTrailId != null
          ? ['==', ['coalesce', ['get', 'osm_id'], ['id']], selectedTrailId]
          : ['==', ['coalesce', ['get', 'osm_id'], ['id']], -1]
        if (map.getLayer('Ways-selected')) map.setFilter('Ways-selected', filter as any)
        if (map.getLayer('Route-selected')) map.setFilter('Route-selected', filter as any)
      } catch {}
      fetchViewportData(map).catch((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error('Failed to refresh data after style change', err)
      })
      try {
        const c = map.getCenter().toArray() as [number, number]
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            center: c,
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
            style: styleUrl,
            showRoutes,
            showWays,
          })
        )
      } catch {}
    })
  }, [styleUrl])

  // Selection highlight filter sync
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      const filter = selectedTrailId != null
        ? ['==', ['coalesce', ['get', 'osm_id'], ['id']], selectedTrailId]
        : ['==', ['coalesce', ['get', 'osm_id'], ['id']], -1]
      if (map.getLayer('Ways-selected')) map.setFilter('Ways-selected', filter as any)
      if (map.getLayer('Route-selected')) map.setFilter('Route-selected', filter as any)
    } catch {}
  }, [selectedTrailId])

  // Visibility toggles
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      if (map.getLayer(ROUTE_LAYER_ID)) map.setLayoutProperty(ROUTE_LAYER_ID, 'visibility', showRoutes ? 'visible' : 'none')
      if (map.getLayer(ROUTE_HALO_LAYER_ID)) map.setLayoutProperty(ROUTE_HALO_LAYER_ID, 'visibility', isDarkStyle(styleUrl) && showRoutes ? 'visible' : 'none')
      if (map.getLayer(WAYS_LAYER_ID)) map.setLayoutProperty(WAYS_LAYER_ID, 'visibility', showWays ? 'visible' : 'none')
    } catch {}
    try {
      const c = map.getCenter().toArray() as [number, number]
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          center: c,
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
          style: styleUrl,
          showRoutes,
          showWays,
        })
      )
    } catch {}
  }, [showRoutes, showWays])

  // Width scaling effect (keep zoom at top-level)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      if (affectRoutes && map.getLayer(ROUTE_LAYER_ID)) {
        map.setPaintProperty(ROUTE_LAYER_ID, 'line-width', routeWidthExpression(widthScale) as any)
      }
      if (affectRoutes && map.getLayer(ROUTE_HALO_LAYER_ID)) {
        map.setPaintProperty(ROUTE_HALO_LAYER_ID, 'line-width', routeHaloWidthExpression(widthScale) as any)
      }
      if (affectWays && map.getLayer(WAYS_LAYER_ID)) {
        map.setPaintProperty(WAYS_LAYER_ID, 'line-width', waysWidthExpression(widthScale) as any)
      }
    } catch {}
  }, [widthScale, affectRoutes, affectWays])

  function handleToggleStyle() {
    setStyleUrl((prev) => (prev === DARK_STYLE ? OUTDOORS_STYLE : DARK_STYLE))
  }

  function handleResetWidths() {
    setWidthScale(1)
  }

  // Terrain exaggeration effect
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      map.setTerrain({ source: 'mapbox-dem', exaggeration: terrainExaggeration } as any)
    } catch {}
  }, [terrainExaggeration])

  return (
    <div className="relative h-screen w-screen">
      <div ref={containerRef} className="h-full w-full" />
      <div className="absolute left-4 top-4 z-10 flex gap-2">
        <button
          className="rounded-md bg-black/70 px-3 py-2 text-xs font-medium text-white shadow hover:bg-black/80"
          onClick={handleToggleStyle}
        >
          {styleUrl === DARK_STYLE ? 'Switch to Outdoors' : 'Switch to Dark'}
        </button>
        <LayerToggles
          showRoutes={showRoutes}
          showWays={showWays}
          onToggleRoutes={() => setShowRoutes(v => !v)}
          onToggleWays={() => setShowWays(v => !v)}
        />
        <div className="flex items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-white">
          <label htmlFor="width-scale" className="text-xs">Width</label>
          <input
            id="width-scale"
            type="range"
            min={0.5}
            max={3}
            step={0.1}
            value={widthScale}
            onChange={(e) => setWidthScale(parseFloat(e.target.value))}
            className="h-1 w-28 cursor-pointer accent-purple-400"
          />
          <span className="w-8 text-right text-[10px] tabular-nums">{widthScale.toFixed(1)}x</span>
          <div className="ml-2 flex items-center gap-2">
            <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={affectRoutes} onChange={(e) => setAffectRoutes(e.target.checked)} />Route</label>
            <label className="flex items-center gap-1 text-[10px]"><input type="checkbox" checked={affectWays} onChange={(e) => setAffectWays(e.target.checked)} />Ways</label>
          </div>
          <button onClick={handleResetWidths} className="ml-2 rounded bg-purple-600 px-2 py-1 text-[10px] font-medium hover:bg-purple-700">Reset</button>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-black/60 px-3 py-2 text-white">
          <label htmlFor="terrain-scale" className="text-xs">Terrain</label>
          <input
            id="terrain-scale"
            type="range"
            min={0}
            max={3}
            step={0.1}
            value={terrainExaggeration}
            onChange={(e) => setTerrainExaggeration(parseFloat(e.target.value))}
            className="h-1 w-28 cursor-pointer accent-emerald-400"
          />
          <span className="w-8 text-right text-[10px] tabular-nums">{terrainExaggeration.toFixed(1)}x</span>
          <button onClick={() => setTerrainExaggeration(1)} className="ml-2 rounded bg-emerald-600 px-2 py-1 text-[10px] font-medium hover:bg-emerald-700">Reset</button>
        </div>
      </div>
    </div>
  )
}


