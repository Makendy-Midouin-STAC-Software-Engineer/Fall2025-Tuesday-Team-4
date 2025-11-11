import { ClearRefinements, useRefinementList } from 'react-instantsearch'
import { SearchBar } from '@/components/search/SearchBar'
import type { TrailHit } from '@/lib/algoliaClient'

interface FooterBarProps {
  onOpenOverlay: () => void
  onHitClick: (hit: TrailHit) => void
}

export function FooterBar({ onOpenOverlay, onHitClick }: FooterBarProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 w-[min(100%,1000px)] -translate-x-1/2">
      <div className="pointer-events-auto glass rounded-3xl px-3.5 py-3 text-white shadow-lg backdrop-blur">
        <div className="flex flex-col gap-3">
          <SearchFilters />

          <SearchBar
            onOpenOverlay={onOpenOverlay}
            onHitClick={onHitClick}
            containerClassName="w-full"
            inputClassName="w-full rounded-lg bg-black/35 px-3 py-1.5 text-sm placeholder-white/50 outline-none ring-1 ring-white/15 focus:ring-white/30"
          />
        </div>
      </div>
    </div>
  )
}

function SearchFilters() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-[0.25em] text-white/60">Filters</span>
        <ClearRefinements
          translations={{ resetButtonText: 'Clear filters' }}
          classNames={{
            button:
              'rounded-md bg-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.2em] text-white/75 transition enabled:hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed',
          }}
        />
      </div>
      <FilterChips attribute="region" label="Region" />
      <FilterChips attribute="type" label="Type" />
    </div>
  )
}

interface FilterChipsProps {
  attribute: string
  label: string
}

function FilterChips({ attribute, label }: FilterChipsProps) {
  const { items, refine } = useRefinementList({ attribute, sortBy: ['name:asc'], limit: 12 })
  if (!items.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/60">{label}</span>
      {items.map((item) => (
        <button
          key={item.value}
          aria-pressed={item.isRefined}
          onClick={() => refine(item.value)}
          className={`rounded-md px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] transition ${
            item.isRefined
              ? 'bg-white/18 text-white shadow-sm ring-1 ring-white/35'
              : 'bg-black/45 text-white/70 hover:bg-black/55 hover:text-white/90'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}


