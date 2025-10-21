
interface LayerTogglesProps {
  showRoutes: boolean
  showWays: boolean
  onToggleRoutes: () => void
  onToggleWays: () => void
}

export function LayerToggles({ showRoutes, showWays, onToggleRoutes, onToggleWays }: LayerTogglesProps) {
  return (
    <div className="flex gap-2">
      <button
        aria-pressed={showRoutes}
        className={`rounded-md px-3 py-2 text-xs font-medium shadow ${showRoutes ? 'bg-purple-600 text-white' : 'bg-black/60 text-white/80 hover:bg-black/70'}`}
        onClick={onToggleRoutes}
      >
        Routes
      </button>
      <button
        aria-pressed={showWays}
        className={`rounded-md px-3 py-2 text-xs font-medium shadow ${showWays ? 'bg-purple-600 text-white' : 'bg-black/60 text-white/80 hover:bg-black/70'}`}
        onClick={onToggleWays}
      >
        Ways
      </button>
    </div>
  )
}


