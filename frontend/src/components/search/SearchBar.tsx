import { useEffect, useMemo, useState } from 'react'
import { useHits, useSearchBox } from 'react-instantsearch'
import type { TrailHit } from '@/lib/algoliaClient'
import { getTrailTypeTag } from '@/utils/trailType'

interface SearchBarProps {
  onOpenOverlay: () => void
  onHitClick: (hit: TrailHit) => void
  containerClassName?: string
  inputClassName?: string
}

export function SearchBar({ onOpenOverlay, onHitClick, containerClassName, inputClassName }: SearchBarProps) {
  const { query, refine } = useSearchBox()
  const { hits } = useHits<TrailHit>()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  const topHits = useMemo(() => hits.slice(0, 5), [hits])

  useEffect(() => {
    setOpen(Boolean(query && query.trim().length > 0 && topHits.length > 0))
    setActive(0)
  }, [query, topHits.length])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || topHits.length === 0) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((p) => (p + 1) % topHits.length) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((p) => (p - 1 + topHits.length) % topHits.length) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = topHits[active]
      if (hit) { onHitClick(hit); setOpen(false) }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className={containerClassName || ''}>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => refine(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search trails…"
          className={inputClassName || 'w-full rounded-xl bg-black/40 px-3 py-2 text-sm placeholder-white/50 outline-none ring-1 ring-white/20 focus:ring-white/40'}
        />

        {open && (
          <div className="absolute bottom-full left-0 right-0 mb-2 max-h-64 overflow-auto rounded-xl bg-black/80 p-1 text-white shadow-lg ring-1 ring-white/10">
            {topHits.map((hit, idx) => {
              const { label, variant } = getTrailTypeTag(hit.type)
              const badgeClass = variant === 'route' ? 'bg-purple-600/80' : variant === 'way' ? 'bg-emerald-600/80' : 'bg-slate-600/80'
              return (
                <button
                  key={`${String(hit.type)}-${String(hit.osm_id)}`}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10 ${idx === active ? 'bg-white/10' : ''}`}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => { onHitClick(hit); setOpen(false) }}
                >
                  <span className="truncate">{hit.name || '(Unnamed)'}</span>
                  <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium tracking-wide ${badgeClass}`}>{label}</span>
                </button>
              )
            })}
            <button
              className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
              onClick={() => { onOpenOverlay(); setOpen(false) }}
            >
              See more results…
            </button>
          </div>
        )}
      </div>
    </div>
  )
}


