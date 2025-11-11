import { ClearRefinements, CurrentRefinements, RefinementList, SearchBox } from 'react-instantsearch'
import { useInfiniteHits } from 'react-instantsearch'
import type { TrailHit } from '@/lib/algoliaClient'
import { getTrailTypeTag } from '@/utils/trailType'

interface SearchOverlayProps {
  open: boolean
  onClose: () => void
  onHitClick: (hit: TrailHit) => void
}

export function SearchOverlay({ open, onClose, onHitClick }: SearchOverlayProps) {
  const { hits, isLastPage, showMore } = useInfiniteHits<TrailHit>({ escapeHTML: false })

  return (
    <aside
      className={`pointer-events-auto fixed inset-0 z-40 flex items-start justify-center bg-black/60 backdrop-blur-sm transition-opacity ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      aria-hidden={!open}
    >
      <div className={`mt-20 w-[min(100%,1000px)] rounded-2xl bg-zinc-900/95 p-6 text-white shadow-2xl ring-1 ring-white/10 transition-transform ${open ? 'translate-y-0' : '-translate-y-4'}`}>
        <div className="relative">
          <button
            onClick={onClose}
            aria-label="Close search"
            className="absolute right-0 top-0 text-2xl text-white/70 transition hover:text-white"
          >
            ×
          </button>
          <div className="pr-8">
            <SearchBox placeholder="Search all trails…" classNames={{ input: 'w-full rounded-xl bg-black/40 px-3 py-2 text-sm placeholder-white/50 outline-none ring-1 ring-white/20 focus:ring-white/40' }} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <CurrentRefinements classNames={{ root: 'flex flex-wrap gap-2', item: 'rounded bg-white/10 px-2 py-1 text-xs' }} />
          <ClearRefinements translations={{ resetButtonText: 'Clear' }} classNames={{ button: 'ml-auto rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20' }} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="md:col-span-1 space-y-4">
            <div>
              <div className="mb-2 text-xs uppercase tracking-widest text-white/60">Region</div>
              <RefinementList attribute="region" classNames={{ list: 'space-y-1', label: 'flex items-center gap-2 text-sm', checkbox: 'accent-emerald-500', count: 'ml-auto text-white/40' }} />
            </div>
            <div>
              <div className="mb-2 text-xs uppercase tracking-widest text-white/60">Type</div>
              <RefinementList attribute="type" classNames={{ list: 'space-y-1', label: 'flex items-center gap-2 text-sm', checkbox: 'accent-purple-500', count: 'ml-auto text-white/40' }} />
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="max-h-[60vh] overflow-auto rounded-xl bg-black/30 p-1 ring-1 ring-white/10">
              {hits.map((hit) => {
                const { label, variant } = getTrailTypeTag(hit.type)
                const badgeClass = variant === 'route' ? 'bg-purple-600/80' : variant === 'way' ? 'bg-emerald-600/80' : 'bg-slate-600/80'
                return (
                  <button
                    key={`${String(hit.type)}-${String(hit.osm_id)}`}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                    onClick={() => { onHitClick(hit); onClose() }}
                  >
                    <span className="truncate">{hit.name || '(Unnamed)'}</span>
                    <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium tracking-wide ${badgeClass}`}>{label}</span>
                  </button>
                )
              })}
              {!isLastPage && (
                <div className="p-2">
                  <button onClick={showMore} className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20">Load more</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}


