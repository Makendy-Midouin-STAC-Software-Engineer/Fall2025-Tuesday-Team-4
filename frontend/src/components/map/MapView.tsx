import { useEffect, useRef, useState } from 'react'
import type { Map as MapboxMap, LngLatLike, MapboxOptions } from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

import { TopBarControls } from '@/components/overlay/TopBarControls'
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

interface MapViewProps {
  initialCenter?: LngLatLike
  initialZoom?: number
}

export function MapView({ initialCenter = [-122.447303, 37.753574], initialZoom = 10 }: MapViewProps) {
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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

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
    viewStateRef.current = { style: styleUrl, showRoutes, showWays }

    cleanupResizeRef.current = attachResizeHandlers(map, containerRef.current)

    const persist = () => {
      saveViewState(map, viewStateRef.current)
    }

    map.on('load', () => {
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
    map.on('rotateend', persist)
    map.on('pitchend', persist)

    map.on('error', (event) => {
      // eslint-disable-next-line no-console
      console.error('Mapbox error', event.error?.message ? event.error : event)
    })

    return () => {
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
      </div>

      <TrailInfoPanel open={Boolean(selectedTrail)} trail={selectedTrail} onClose={() => setSelectedTrail(null)} />
    </div>
  )
}