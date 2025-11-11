import { useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, LngLatLike, MapboxOptions } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import { TopBarControls } from '@/components/overlay/TopBarControls'
import { FooterBar } from '@/components/overlay/footer/FooterBar'
import { WaysLegend } from '@/components/legend/WaysLegend'
import { TrailInfoPanel } from '@/components/panels/TrailInfoPanel'
import { Logo } from '@/components/branding/Logo'
import { initMap, attachResizeHandlers } from '@/utils/map/initMap'
import { updateBaseStyle } from '@/utils/map/updateBaseStyle'
import { addTrailSources } from '@/utils/map/addTrailSources'
import { addTrailLayers, ROUTE_HALO_LAYER_ID, ROUTE_LAYER_ID, WAYS_LAYER_ID } from '@/utils/map/addTrailLayers'
import { addHoverHighlight, ensureSelectionHighlightLayers, syncSelectionFilter, wireClickSelection } from '@/utils/map/interactionHandlers'
import { DARK_STYLE, OUTDOORS_STYLE, isDarkStyle, routeHaloWidthExpression, routeWidthExpression, waysWidthExpression } from '@/utils/map/trailColoring'
import { initialStyleFromStorage, initialTogglesFromStorage, loadSavedState, saveViewState } from '@/utils/map/persistence'
import type { ViewPreferences } from '@/utils/map/persistence'
import { applyWaysLegendFilter, WAYS_LEGEND_BUCKETS } from '@/utils/map/waysLegend'
import type { TrailSummary } from '@/types/trail'
import { AlgoliaProvider } from '@/components/search/AlgoliaProvider'
import { SearchOverlay } from '@/components/search/SearchOverlay'
import type { TrailHit } from '@/lib/algoliaClient'
import { focusTrailByOsmId } from '@/utils/map/focusByOsmId'
import { featureToTrailSummary } from '@/utils/map/interactionHandlers'
import { ROUTES_SOURCE_LAYER, WAYS_SOURCE_LAYER, ID_PROP } from '@/utils/map/vectorTileConfig'
import type { MapboxGeoJSONFeature } from 'mapbox-gl'
import { RegionTogglePanel } from '@/components/overlay/RegionTogglePanel'
import { REGIONS, type RegionId, getRegionMeta } from '@/utils/regions/regionsMeta'
import { loadRegionGeoJSON, ensureRegionSource } from '@/utils/regions/regionsSource'
import { ensureRegionOutlineLayer, setRegionVisibility as applyRegionVisibility } from '@/utils/regions/regionsLayer'
import { normalizeTrailType } from '@/utils/trailType'

const DEFAULT_INITIAL_CENTER: LngLatLike = [-99.5, 37.8]
const DEFAULT_INITIAL_ZOOM = 2.08
const DEFAULT_INITIAL_PITCH = 55
const DEFAULT_INITIAL_BEARING = 0
const REGION_VISIBILITY_KEY = 'ihike:region-visibility'
const DEFAULT_REGION_VISIBILITY: Record<RegionId, boolean> = {
  northeast: true,
  midwest: true,
  south: true,
  west: true,
  alaska: true,
  hawaii: true,
}

interface MapViewProps {
  initialCenter?: LngLatLike
  initialZoom?: number
}

export function MapView({ initialCenter = DEFAULT_INITIAL_CENTER, initialZoom = DEFAULT_INITIAL_ZOOM }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const cleanupResizeRef = useRef<(() => void) | null>(null)
  const viewStateRef = useRef<ViewPreferences>({ style: DARK_STYLE, showRoutes: true, showWays: true })

  const [styleUrl, setStyleUrl] = useState<string>(() => initialStyleFromStorage(DARK_STYLE))
  const initialToggles = initialTogglesFromStorage(true, true)
  const [showRoutes, setShowRoutes] = useState<boolean>(initialToggles.showRoutes)
  const [showWays, setShowWays] = useState<boolean>(initialToggles.showWays)
  const [widthScale, setWidthScale] = useState<number>(1)
  const [affectRoutes, setAffectRoutes] = useState<boolean>(true)
  const [affectWays, setAffectWays] = useState<boolean>(true)
  const [terrainExaggeration, setTerrainExaggeration] = useState<number>(1)
  const [legendOpen, setLegendOpen] = useState<boolean>(true)
  const [legendSelections, setLegendSelections] = useState<boolean[]>(() => WAYS_LEGEND_BUCKETS.map(() => true))
  const [selectedTrail, setSelectedTrail] = useState<TrailSummary | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(initialZoom)
  const [searchOpen, setSearchOpen] = useState<boolean>(false)
  const [regionVisibility, setRegionVisibilityState] = useState<Record<RegionId, boolean>>(() => {
    const stored = safeStorageGet<Record<RegionId, boolean>>(REGION_VISIBILITY_KEY)
    return stored ? { ...DEFAULT_REGION_VISIBILITY, ...stored } : DEFAULT_REGION_VISIBILITY
  })

  useEffect(() => {
    safeStorageSet(REGION_VISIBILITY_KEY, regionVisibility)
  }, [regionVisibility])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const saved = loadSavedState()
    const fallbackCenter = (saved?.center ?? initialCenter) as LngLatLike
    const fallbackZoom = saved?.zoom ?? initialZoom
    const fallbackBearing = saved?.bearing ?? DEFAULT_INITIAL_BEARING
    const fallbackPitch = saved?.pitch ?? DEFAULT_INITIAL_PITCH

    const options: Partial<MapboxOptions> = {
      style: styleUrl,
      center: fallbackCenter,
      zoom: fallbackZoom,
      bearing: fallbackBearing,
      pitch: fallbackPitch,
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
    viewStateRef.current = { style: styleUrl, showRoutes, showWays }

    cleanupResizeRef.current = attachResizeHandlers(map, containerRef.current)

    const persist = () => {
      saveViewState(map, viewStateRef.current)
    }

    const handleZoom = () => {
      setZoomLevel(Number(map.getZoom().toFixed(2)))
    }

    handleZoom()

    map.on('load', () => {
      handleZoom()
      addTrailSources(map)
      addTrailLayers(map, { routesVisible: showRoutes, waysVisible: showWays, styleUrl, widthScale })
      addHoverHighlight(map)
      ensureSelectionHighlightLayers(map)
      wireClickSelection(map, (trail) => setSelectedTrail(trail))
      applyWaysLegendFilter(map, legendSelections, showWays)
      persist()
    })

    map.on('moveend', persist)
    map.on('zoomend', persist)
    map.on('zoom', handleZoom)
    map.on('zoomend', handleZoom)
    map.on('rotateend', persist)
    map.on('pitchend', persist)

    map.on('error', (event) => {
      // eslint-disable-next-line no-console
      console.error('Mapbox error', event.error?.message ? event.error : event)
    })

    return () => {
      map.off('zoom', handleZoom)
      map.off('zoomend', handleZoom)
      try { cleanupResizeRef.current?.() } catch {}
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    viewStateRef.current = { style: styleUrl, showRoutes, showWays }
  }, [styleUrl, showRoutes, showWays])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    updateBaseStyle(map, styleUrl, { routesVisible: showRoutes, waysVisible: showWays, widthScale })
    map.once('style.load', () => {
      addHoverHighlight(map)
      ensureSelectionHighlightLayers(map)
      wireClickSelection(map, (trail) => setSelectedTrail(trail))
      applyWaysLegendFilter(map, legendSelections, showWays)
      syncSelectionFilter(map, selectedTrail?.id ?? null)
      saveViewState(map, viewStateRef.current)
    })
  }, [styleUrl])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    syncSelectionFilter(map, selectedTrail?.id ?? null)
  }, [selectedTrail])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      if (map.getLayer(ROUTE_LAYER_ID)) map.setLayoutProperty(ROUTE_LAYER_ID, 'visibility', showRoutes ? 'visible' : 'none')
      if (map.getLayer(ROUTE_HALO_LAYER_ID)) {
        const visible = isDarkStyle(styleUrl) && showRoutes ? 'visible' : 'none'
        map.setLayoutProperty(ROUTE_HALO_LAYER_ID, 'visibility', visible)
      }
      if (map.getLayer(WAYS_LAYER_ID)) map.setLayoutProperty(WAYS_LAYER_ID, 'visibility', showWays ? 'visible' : 'none')
    } catch {}
    applyWaysLegendFilter(map, legendSelections, showWays)
    saveViewState(map, viewStateRef.current)
  }, [showRoutes, showWays])

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

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    try {
      map.setTerrain({ source: 'mapbox-dem', exaggeration: terrainExaggeration } as any)
    } catch {}
  }, [terrainExaggeration])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    applyWaysLegendFilter(map, legendSelections, showWays)
  }, [legendSelections])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const ensureAll = async () => {
      if (!map.isStyleLoaded()) return
      for (const meta of REGIONS) {
        const data = await loadRegionGeoJSON(meta)
        if (!data) continue
        ensureRegionSource(map, meta.id, data)
        ensureRegionOutlineLayer(map, meta)
        applyRegionVisibility(map, meta.id, regionVisibility[meta.id])
      }
    }

    const handleStyleLoad = () => { ensureAll() }
    ensureAll()
    try { map.on('style.load', handleStyleLoad) } catch {}
    return () => { try { map.off('style.load', handleStyleLoad) } catch {} }
  }, [regionVisibility])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedTrail(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  function handleToggleStyle() {
    setStyleUrl((prev) => (prev === DARK_STYLE ? OUTDOORS_STYLE : DARK_STYLE))
  }

  function handleResetWidths() {
    setWidthScale(1)
    setAffectRoutes(true)
    setAffectWays(true)
  }

  function handleToggleLegendBucket(index: number) {
    setLegendSelections((prev) => {
      const next = prev.map((value, idx) => (idx === index ? !value : value))
      const hasSelection = next.some(Boolean)
      if (!hasSelection) {
        setShowWays(false)
      } else if (!showWays) {
        setShowWays(true)
      }
      return next
    })
  }

  function handleSelectAllBuckets() {
    setLegendSelections(WAYS_LEGEND_BUCKETS.map(() => true))
    setShowWays(true)
  }

  function handleClearBuckets() {
    setLegendSelections(WAYS_LEGEND_BUCKETS.map(() => false))
    setShowWays(false)
  }

  async function handleToggleRegionVisibility(id: RegionId) {
    const map = mapRef.current
    if (!map) return
    const meta = getRegionMeta(id)
    if (!meta) return
    try {
      const data = await loadRegionGeoJSON(meta)
      if (data) {
        ensureRegionSource(map, meta.id, data)
        ensureRegionOutlineLayer(map, meta)
      }
    } catch {}

    setRegionVisibilityState((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      try { applyRegionVisibility(map, id, next[id]) } catch {}
      return next
    })
  }

  function querySummaryByOsmId(map: MapboxMap, osmId: string | number): TrailSummary | null {
    try {
      const filter = ['==', ['coalesce', ['get', ID_PROP], ['id']], osmId] as any
      const routes = map.querySourceFeatures('routes', { sourceLayer: ROUTES_SOURCE_LAYER as any, filter }) as MapboxGeoJSONFeature[]
      const ways = map.querySourceFeatures('ways', { sourceLayer: WAYS_SOURCE_LAYER as any, filter }) as MapboxGeoJSONFeature[]
      const f = (routes[0] || ways[0])
      if (!f) return null
      return featureToTrailSummary(f)
    } catch {
      return null
    }
  }

  function handleHitClick(hit: TrailHit) {
    const fallbackTrail: TrailSummary = {
      id: hit.osm_id as any,
      name: hit.name ?? null,
      type: normalizeTrailType(hit.type),
      lengthKm: hit.lengthKm ?? null,
      difficulty: hit.difficulty ?? null,
      website: hit.website ?? null,
    }

    const mapInstance = mapRef.current
    if (!mapInstance) {
      setSelectedTrail(fallbackTrail)
      return
    }
    const safeMap: MapboxMap = mapInstance

    focusTrailByOsmId(safeMap, hit, { minZoom: 8 })

    const summaryNow = querySummaryByOsmId(safeMap, hit.osm_id)
    if (summaryNow) {
      setSelectedTrail(summaryNow)
      return
    }

    let resolved = false
    let timeoutId: number | null = null

    function handleAttempt() {
      if (resolved) return
      const summaryLater = querySummaryByOsmId(safeMap, hit.osm_id)
      if (summaryLater) {
        resolved = true
        cleanup()
        setSelectedTrail(summaryLater)
      }
    }

    function cleanup() {
      try { safeMap.off('idle', handleAttempt) } catch {}
      try { safeMap.off('sourcedata', handleAttempt) } catch {}
      if (timeoutId !== null) window.clearTimeout(timeoutId)
    }

    try {
      safeMap.on('idle', handleAttempt)
      safeMap.on('sourcedata', handleAttempt)
    } catch {}

    timeoutId = window.setTimeout(() => {
      if (!resolved) cleanup()
    }, 7000)

    setSelectedTrail(fallbackTrail)
    handleAttempt()
  }

  return (
    <div className="relative h-screen w-screen bg-black">
      <div ref={containerRef} className="h-full w-full" />

      <Logo />

      <div className="pointer-events-none absolute left-6 top-6 z-20 flex flex-col items-start gap-4">
        <div className="pointer-events-auto inline-flex w-max">
          <TopBarControls
            isDarkStyle={styleUrl === DARK_STYLE}
            onToggleStyle={handleToggleStyle}
            showRoutes={showRoutes}
            showWays={showWays}
            onToggleRoutes={() => setShowRoutes((value) => !value)}
            onToggleWays={() => setShowWays((value) => !value)}
            widthScale={widthScale}
            onChangeWidth={setWidthScale}
            affectRoutes={affectRoutes}
            affectWays={affectWays}
            onToggleAffectRoutes={setAffectRoutes}
            onToggleAffectWays={setAffectWays}
            onResetWidths={handleResetWidths}
            terrainExaggeration={terrainExaggeration}
            onChangeTerrain={setTerrainExaggeration}
            onResetTerrain={() => setTerrainExaggeration(1)}
          />
        </div>
        
        <div className="pointer-events-auto inline-flex w-max">
          <WaysLegend
            isOpen={legendOpen}
            onOpenChange={setLegendOpen}
            buckets={legendSelections}
            onToggleBucket={handleToggleLegendBucket}
            onSelectAll={handleSelectAllBuckets}
            onClearAll={handleClearBuckets}
          />
        </div>

        <div className="pointer-events-auto inline-flex w-max">
          <RegionTogglePanel visibility={regionVisibility} onToggle={handleToggleRegionVisibility} />
        </div>
      </div>

      <TrailInfoPanel open={Boolean(selectedTrail)} trail={selectedTrail} onClose={() => setSelectedTrail(null)} />
      <AlgoliaProvider>
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} onHitClick={handleHitClick} />
        <FooterBar onOpenOverlay={() => setSearchOpen(true)} onHitClick={handleHitClick} />
      </AlgoliaProvider>
      <div className="pointer-events-none absolute bottom-6 right-6 z-20">
        <div className="rounded-md bg-zinc-900/90 px-3 py-1 font-mono text-xs uppercase tracking-wide text-white shadow-lg backdrop-blur">
          Zoom {zoomLevel.toFixed(2)}
        </div>
      </div>
    </div>
  )
}

function safeStorageGet<T = unknown>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}