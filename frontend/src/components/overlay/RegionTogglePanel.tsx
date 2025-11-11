import type { RegionId } from '@/utils/regions/regionsMeta'
import { REGIONS } from '@/utils/regions/regionsMeta'

interface RegionTogglePanelProps {
  visibility: Record<RegionId, boolean>
  onToggle: (id: RegionId) => void
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const expanded =
    normalized.length === 3 ? normalized.split('').map((char) => `${char}${char}`).join('') : normalized.padEnd(6, '0')
  const bigint = Number.parseInt(expanded, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export function RegionTogglePanel({ visibility, onToggle }: RegionTogglePanelProps) {
  return (
    <div className="glass w-64 rounded-3xl px-6 py-6 font-jersey text-white shadow-xl">
      <div className="mb-4">
        <h2 className="text-2xl uppercase tracking-wide">Regions</h2>
        <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/70">Toggle outlines</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {REGIONS.map((region) => {
          const isVisible = Boolean(visibility[region.id])
          const activeStyle = isVisible
            ? {
                background: `linear-gradient(145deg, ${hexToRgba(region.color, 0.95)} 0%, ${hexToRgba(region.color, 0.7)} 100%)`,
              }
            : {
                background: 'transparent',
                borderColor: hexToRgba(region.color, 0.4),
              }
          return (
            <button
              key={region.id}
              type="button"
              aria-pressed={isVisible}
              onClick={() => onToggle(region.id)}
              className={`flex items-center justify-center rounded-2xl px-4 py-4 text-lg uppercase tracking-wide transition ${
                isVisible ? 'shadow-lg' : 'border bg-black/30 hover:bg-black/40'
              }`}
              style={activeStyle}
            >
              <span className="text-white">{region.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}


