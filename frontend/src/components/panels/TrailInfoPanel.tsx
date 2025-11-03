import type { TrailSummary } from '@/types/trail'

interface TrailInfoPanelProps {
  open: boolean
  trail: TrailSummary | null
  onClose: () => void
}

export function TrailInfoPanel({ open, trail, onClose }: TrailInfoPanelProps) {
  const info = trail ?? null
  const name = info?.name || 'N/A'
  const type = info?.type || 'Route'
  const lengthText = typeof info?.lengthKm === 'number' ? `${info.lengthKm.toFixed(2)} km` : 'N/A'
  const difficulty = info?.difficulty || 'N/A'
  const website = info?.website || 'N/A'

  return (
    <aside
      className={`pointer-events-auto fixed right-0 top-0 z-30 flex h-full w-[360px] max-w-full flex-col bg-black/80 font-jersey text-white shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out backdrop-blur-2xl ${open ? 'translate-x-0' : 'translate-x-full'}`}
      aria-hidden={!open}
    >
      <div className="relative flex-1 overflow-y-auto px-8 py-10">
        <button
          onClick={onClose}
          aria-label="Close trail details"
          className="absolute right-6 top-6 text-3xl text-white/70 transition hover:text-white"
        >
          ×
        </button>

        <h2 className="mb-10 text-4xl uppercase tracking-widest text-white drop-shadow">{name}</h2>

        <InfoRow label="Type" value={type} />
        <InfoRow label="Length" value={lengthText} />
        <InfoRow label="Difficulty" value={difficulty} />
        <InfoRow label="Website" value={website} isLink={website !== 'N/A' && website.startsWith('http')} />
      </div>
    </aside>
  )
}

interface InfoRowProps {
  label: string
  value: string
  isLink?: boolean
}

function InfoRow({ label, value, isLink }: InfoRowProps) {
  return (
    <div className="mb-10 uppercase">
      <div className="text-sm tracking-[0.4em] text-white/50">{label}</div>
      {isLink ? (
        <a href={value} target="_blank" rel="noreferrer" className="mt-2 block text-2xl text-white underline-offset-4 hover:underline">
          {value}
        </a>
      ) : (
        <div className="mt-2 text-2xl text-white">{value}</div>
      )}
    </div>
  )
}

