import logoImage from '@/assets/iHike_logo-removebg-preview.png'

export function Logo() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
      <img
        src={logoImage}
        alt="iHike logo"
        className="h-28 w-auto shrink-0 object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.5)] md:h-32"
      />
    </div>
  )
}

