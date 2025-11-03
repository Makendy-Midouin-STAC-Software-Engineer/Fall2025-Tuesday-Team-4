import { Fragment } from 'react'

import { WAYS_LEGEND_BUCKETS } from '@/utils/map/waysLegend'

interface WaysLegendProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  buckets: boolean[]
  onToggleBucket: (index: number) => void
  onSelectAll: () => void
  onClearAll: () => void
}

export function WaysLegend({
  isOpen,
  onOpenChange,
  buckets,
  onToggleBucket,
  onSelectAll,
  onClearAll,
}: WaysLegendProps) {
  if (!isOpen) {
    return (
      <button
        onClick={() => onOpenChange(true)}
        className="glass font-jersey rounded-2xl px-4 py-2 text-lg uppercase tracking-wide text-white transition hover:bg-black/40"
      >
        Ways Legend
      </button>
    )
  }

  return (
    <div className="glass w-64 rounded-3xl px-6 py-6 font-jersey text-white shadow-xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl uppercase tracking-wide">Ways Legend</h2>
        <button
          onClick={() => onOpenChange(false)}
          aria-label="Collapse Ways Legend"
          className="rounded-full bg-white/10 px-3 py-1 text-sm text-white/80 transition hover:bg-white/20"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {WAYS_LEGEND_BUCKETS.map((bucket, index) => (
          <LegendRow
            key={bucket.label}
            label={bucket.label}
            color={bucket.color}
            checked={Boolean(buckets[index])}
            onToggle={() => onToggleBucket(index)}
          />
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3">
        <LegendActionButton label="Select All" onClick={onSelectAll} />
        <LegendActionButton label="Deselect" onClick={onClearAll} />
      </div>
    </div>
  )
}

interface LegendRowProps {
  label: string
  color: string
  checked: boolean
  onToggle: () => void
}

function LegendRow({ label, color, checked, onToggle }: LegendRowProps) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={checked}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${checked ? 'bg-white/15' : 'bg-black/30 hover:bg-black/40'}`}
    >
      <span className="text-lg uppercase tracking-wide text-white">{label}</span>
      <span className="flex items-center gap-2">
        <span className="h-1 w-14 rounded-full" style={{ backgroundColor: color }} />
        <span className={`grid h-8 w-8 place-items-center rounded-full border border-white/30 ${checked ? 'bg-[#6750A4]' : 'bg-transparent'}`}>
          {checked ? (
            <Fragment>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M10 16.4L6 12.4L7.4 11L10 13.6L16.6 7L18 8.4L10 16.4Z" fill="white" />
              </svg>
            </Fragment>
          ) : null}
        </span>
      </span>
    </button>
  )
}

interface LegendActionButtonProps {
  label: string
  onClick: () => void
}

function LegendActionButton({ label, onClick }: LegendActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="glass flex-1 rounded-2xl px-4 py-2 text-lg uppercase tracking-wide text-white transition hover:bg-black/40"
    >
      {label}
    </button>
  )
}

export { WAYS_LEGEND_BUCKETS as waysLegendBuckets }

