import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
interface TopBarControlsProps {
  isDarkStyle: boolean
  onToggleStyle: () => void
  showRoutes: boolean
  showWays: boolean
  onToggleRoutes: () => void
  onToggleWays: () => void
  widthScale: number
  onChangeWidth: (value: number) => void
  affectRoutes: boolean
  affectWays: boolean
  onToggleAffectRoutes: (value: boolean) => void
  onToggleAffectWays: (value: boolean) => void
  onResetWidths: () => void
  terrainExaggeration: number
  onChangeTerrain: (value: number) => void
  onResetTerrain: () => void
}

export function TopBarControls({
  isDarkStyle,
  onToggleStyle,
  showRoutes,
  showWays,
  onToggleRoutes,
  onToggleWays,
  widthScale,
  onChangeWidth,
  affectRoutes,
  affectWays,
  onToggleAffectRoutes,
  onToggleAffectWays,
  onResetWidths,
  terrainExaggeration,
  onChangeTerrain,
  onResetTerrain,
}: TopBarControlsProps) {
  return (
    <div className="flex w-max flex-col gap-3 text-white">
      <div className="flex flex-wrap gap-3">
        <button
          onClick={onToggleStyle}
          className="glass font-jersey rounded-2xl px-5 py-2 text-lg uppercase tracking-wide transition hover:bg-black/40"
        >
          {isDarkStyle ? 'Switch to Outdoors' : 'Switch to Dark'}
        </button>

        <div className="flex gap-3">
          <ToggleButton label="Routes" isActive={showRoutes} onToggle={onToggleRoutes} />
          <ToggleButton label="Ways" isActive={showWays} onToggle={onToggleWays} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SliderCard
          title="Width"
          valueLabel={`${widthScale.toFixed(1)}x`}
          rangeClassName="accent-purple-400"
          rangeProps={{
            'aria-label': 'Adjust line width scale',
            min: 0.5,
            max: 3,
            step: 0.1,
            value: widthScale,
            onChange: (event: ChangeEvent<HTMLInputElement>) => onChangeWidth(Number(event.target.value)),
          }}
          footer={
            <div className="flex w-full items-center justify-between text-xs uppercase tracking-wide text-white/70">
              <div className="flex items-center gap-2">
                <LegendCheckbox label="Routes" checked={affectRoutes} onChange={onToggleAffectRoutes} />
                <LegendCheckbox label="Ways" checked={affectWays} onChange={onToggleAffectWays} />
              </div>
              <button
                onClick={onResetWidths}
                className="glass rounded-xl px-3 py-2 text-xs uppercase tracking-wide transition hover:bg-black/40"
              >
                Reset
              </button>
            </div>
          }
        />

        <SliderCard
          title="Terrain"
          valueLabel={`${terrainExaggeration.toFixed(1)}x`}
          rangeClassName="accent-emerald-400"
          rangeProps={{
            'aria-label': 'Adjust terrain exaggeration',
            min: 0,
            max: 3,
            step: 0.1,
            value: terrainExaggeration,
            onChange: (event: ChangeEvent<HTMLInputElement>) => onChangeTerrain(Number(event.target.value)),
          }}
          footer={
            <div className="flex w-full justify-end">
              <button
                onClick={onResetTerrain}
                className="glass rounded-xl px-3 py-2 text-xs uppercase tracking-wide transition hover:bg-black/40"
              >
                Reset
              </button>
            </div>
          }
        />
      </div>
    </div>
  )
}

interface ToggleButtonProps {
  label: string
  isActive: boolean
  onToggle: () => void
}

function ToggleButton({ label, isActive, onToggle }: ToggleButtonProps) {
  return (
    <button
      aria-pressed={isActive}
      onClick={onToggle}
      className={`glass rounded-2xl px-4 py-2 text-lg transition ${isActive ? 'text-white opacity-100' : 'text-white/70 opacity-80 hover:opacity-100'}`}
    >
      {label}
    </button>
  )
}

interface SliderCardProps {
  title: string
  valueLabel: string
  rangeProps: InputHTMLAttributes<HTMLInputElement>
  rangeClassName?: string
  footer?: ReactNode
}

function SliderCard({ title, valueLabel, rangeProps, rangeClassName, footer }: SliderCardProps) {
  const sliderClass = `h-1 w-full cursor-pointer rounded-full bg-white/20 ${rangeClassName ?? 'accent-purple-400'}`

  return (
    <div className="glass flex w-full max-w-[280px] flex-col gap-3 rounded-2xl px-4 py-3 font-jersey text-base">
      <div className="flex items-center justify-between text-sm uppercase tracking-wide text-white/70">
        <span>{title}</span>
        <span className="text-lg text-white/90">{valueLabel}</span>
      </div>
      <input
        {...rangeProps}
        type="range"
        className={sliderClass}
      />
      {footer ? <div>{footer}</div> : null}
    </div>
  )
}

interface LegendCheckboxProps {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}

function LegendCheckbox({ label, checked, onChange }: LegendCheckboxProps) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-xs uppercase tracking-wide transition ${checked ? 'bg-white/15 text-white' : 'bg-black/40 text-white/70 hover:bg-black/50'}`}
    >
      <span>{label}</span>
      <span className={`grid h-7 w-7 place-items-center rounded-full border border-white/30 ${checked ? 'bg-[#6750A4]' : 'bg-transparent'}`}>
        {checked ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M10 16.4L6 12.4L7.4 11L10 13.6L16.6 7L18 8.4L10 16.4Z" fill="white" />
          </svg>
        ) : null}
      </span>
    </button>
  )
}

