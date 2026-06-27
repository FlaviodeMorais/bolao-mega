'use client'

interface TrevoIconProps {
  size?: number
  /** corA = pétala escura (↖ + ↘), corB = pétala clara (↗ + ↙) */
  corA?: string
  corB?: string
  className?: string
}

// Path do coração centrado em (0,0), ponta apontando para baixo (para o centro da folha)
const HEART = 'M0,-13 C-2,-21 -14,-27 -22,-19 C-30,-11 -28,1 0,22 C28,1 30,-11 22,-19 C14,-27 2,-21 0,-13Z'

/** Trevo 4 folhas fiel ao Manual de Identidade Visual Loterias CAIXA */
export default function TrevoIcon({ size = 28, corA = '#009B63', corB = '#00AB67', className }: TrevoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* ↖ topo-esq: corA escura — ponta aponta para centro ↘ */}
      <g transform="translate(32,32) rotate(45)"><path d={HEART} fill={corA}/></g>
      {/* ↗ topo-dir: corB clara — ponta aponta para centro ↙ */}
      <g transform="translate(68,32) rotate(-45)"><path d={HEART} fill={corB}/></g>
      {/* ↙ baixo-esq: corB clara — ponta aponta para centro ↗ */}
      <g transform="translate(32,68) rotate(135)"><path d={HEART} fill={corB}/></g>
      {/* ↘ baixo-dir: corA escura — ponta aponta para centro ↖ */}
      <g transform="translate(68,68) rotate(-135)"><path d={HEART} fill={corA}/></g>
    </svg>
  )
}
