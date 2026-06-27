'use client'

// Cores oficiais por loteria — Manual de Identidade Visual Loterias CAIXA
const CORES: Record<string, { corA: string; corB: string }> = {
  mega:      { corA: '#009B63', corB: '#00AB67' },
  lotofacil: { corA: '#702A82', corB: '#803594' },
  quina:     { corA: '#00508F', corB: '#005DA4' },
}

interface TrevoIconProps {
  size?: number
  loteria?: string
  /** Override manual de cor — se omitido, usa a loteria */
  corA?: string
  corB?: string
  className?: string
}

const HEART = 'M0,-13 C-2,-21 -14,-27 -22,-19 C-30,-11 -28,1 0,22 C28,1 30,-11 22,-19 C14,-27 2,-21 0,-13Z'

/** Trevo 4 folhas fiel ao Manual de Identidade Visual Loterias CAIXA */
export default function TrevoIcon({ size = 28, loteria = 'mega', corA, corB, className }: TrevoIconProps) {
  const base = CORES[loteria] ?? CORES.mega
  const a = corA ?? base.corA
  const b = corB ?? base.corB
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className} aria-hidden="true">
      <g transform="translate(32,32) rotate(-45)"><path d={HEART} fill={a}/></g>
      <g transform="translate(68,32) rotate(45)"><path d={HEART} fill={b}/></g>
      <g transform="translate(32,68) rotate(-135)"><path d={HEART} fill={b}/></g>
      <g transform="translate(68,68) rotate(135)"><path d={HEART} fill={a}/></g>
    </svg>
  )
}
