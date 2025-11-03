import type { Map as MapboxMap } from 'mapbox-gl'
export const STORAGE_KEY = 'ihike-map-state-v1'

export interface SavedMapState {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
  style: string
  showRoutes: boolean
  showWays: boolean
}

export function loadSavedState(): SavedMapState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedMapState
  } catch {
    return null
  }
}

export function saveState(state: SavedMapState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export interface ViewPreferences {
  style: string
  showRoutes: boolean
  showWays: boolean
}

export function saveViewState(map: MapboxMap, prefs: ViewPreferences): void {
  try {
    const center = map.getCenter().toArray() as [number, number]
    saveState({
      center,
      zoom: map.getZoom(),
      bearing: map.getBearing(),
      pitch: map.getPitch(),
      style: prefs.style,
      showRoutes: prefs.showRoutes,
      showWays: prefs.showWays,
    })
  } catch {}
}

export function initialStyleFromStorage(defaultStyle: string): string {
  const saved = loadSavedState()
  if (saved && typeof saved.style === 'string') return saved.style
  return defaultStyle
}

export function initialTogglesFromStorage(defaultRoutes: boolean, defaultWays: boolean) {
  const saved = loadSavedState()
  return {
    showRoutes: saved?.showRoutes ?? defaultRoutes,
    showWays: saved?.showWays ?? defaultWays,
  }
}

