'use client'
import { useEffect, useState } from 'react'

const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'

interface LotResult {
  numero: number
  dataApuracao: string
  listaDezenas: string[]
  acumulado: boolean
  valorEstimadoProximoConcurso: number
  dataProximoConcurso: string
  listaRateioPremio: { numeroDeGanhadores: number }[]
}

// Cores exatas dos logos oficiais da Caixa
const LOTERIAS = [
  { id: 'megasena',  nome: 'mega-sena',  corA: '#1a7c4f', corB: '#6abf95', glow: 'rgba(26,124,79,.30)',   ballStyle: 'circle' as const, cols: 6 },
  { id: 'lotofacil', nome: 'lotofácil',  corA: '#8b008b', corB: '#c87ec8', glow: 'rgba(139,0,139,.25)',   ballStyle: 'plain'  as const, cols: 5 },
  { id: 'quina',     nome: 'quina',      corA: '#1a0080', corB: '#8080c0', glow: 'rgba(26,0,128,.25)',    ballStyle: 'circle' as const, cols: 5 },
  { id: 'lotomania', nome: 'lotomania',  corA: '#e07000', corB: '#f5b87a', glow: 'rgba(224,112,0,.25)',   ballStyle: 'plain'  as const, cols: 5 },
]

// Trevo 4 folhas idêntico ao logo oficial da Caixa
// diagonal principal (topo-esq + baixo-dir) = corA (escura)
// diagonal secundária (topo-dir + baixo-esq) = corB (clara)
function Trevo({ corA, corB }: { corA: string; corB: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
      <circle cx="32" cy="32" r="28" fill={corA} />
      <circle cx="68" cy="32" r="28" fill={corB} />
      <circle cx="32" cy="68" r="28" fill={corB} />
      <circle cx="68" cy="68" r="28" fill={corA} />
      <circle cx="50" cy="50" r="10" fill={corA} />
    </svg>
  )
}

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function fmtPremio(v: number) {
  if (v >= 1_000_000_000) return `R$ ${(v/1e9).toFixed(0)} bi`
  if (v >= 1_000_000) return `R$ ${(v/1e6).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mi`
  return `R$ ${(v/1000).toFixed(0)}k`
}

function fmtData(d: string) {
  const p = d?.split('/'); if (!p || p.length < 3) return ''
  return `${p[0]} ${MESES[parseInt(p[1])-1]}`
}

export default function LoteriasCards() {
  const [dados, setDados] = useState<Record<string, LotResult | null>>({})
  const [carregando, setCarregando] = useState<Record<string, boolean>>(
    Object.fromEntries(LOTERIAS.map(l => [l.id, true]))
  )

  useEffect(() => {
    LOTERIAS.map(async (lot) => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 8000)
        const r = await fetch(`${BASE}/${lot.id}`, { cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) {
          const json: LotResult = await r.json()
          setDados(prev => ({ ...prev, [lot.id]: json }))
        }
      } catch { /* silently fail */ }
      setCarregando(prev => ({ ...prev, [lot.id]: false }))
    })
  }, [])

  return (
    <div className="lot-section">
      <div className="lot-section-label">🏆 Últimos Resultados da Caixa</div>
      <div className="lot-cards">
        {LOTERIAS.map(lot => {
          const d = dados[lot.id]
          const loading = carregando[lot.id]
          const ganhadores = d?.listaRateioPremio?.[0]?.numeroDeGanhadores ?? null

          return (
            <div key={lot.id} className="lot-card"
              style={{ '--lot-glow': lot.glow, borderColor: `${lot.corA}35` } as React.CSSProperties}
            >
              {/* Topo: logo + nome + prêmio próximo */}
              <div className="lot-card-top">
                <div className="lot-card-logo">
                  <Trevo corA={lot.corA} corB={lot.corB} />
                  <span className="lot-card-nome" style={{ color: lot.corA }}>{lot.nome}</span>
                </div>
                {d && (
                  <div className="lot-card-proximo">
                    <span className="lot-card-proximo-data">próximo · {fmtData(d.dataProximoConcurso)}</span>
                    <span className="lot-card-proximo-val" style={{ color: lot.corA }}>{fmtPremio(d.valorEstimadoProximoConcurso)}</span>
                  </div>
                )}
              </div>

              {loading && <div className="lot-card-loading">carregando...</div>}

              {!loading && d && (
                <>
                  <div className="lot-card-nums" style={{ gridTemplateColumns: `repeat(${lot.cols}, 1fr)` }}>
                    {d.listaDezenas.map((n, i) =>
                      lot.ballStyle === 'circle'
                        ? <span key={i} className="lot-ball" style={{ background: lot.corA, boxShadow: `0 2px 10px ${lot.glow}` }}>{n}</span>
                        : <span key={i} className="lot-plain" style={{ color: lot.corA }}>{n}</span>
                    )}
                  </div>

                  <div className="lot-card-bottom">
                    <span className="lot-badge"
                      style={d.acumulado
                        ? { background: 'rgba(59,130,246,.12)', borderColor: 'rgba(59,130,246,.25)', color: '#60a5fa' }
                        : { background: `${lot.corA}18`, borderColor: `${lot.corA}40`, color: lot.corA }
                      }
                    >
                      {d.acumulado ? '🔥 Acumulou' : ganhadores === 1 ? '🏆 1 Ganhador' : `🏆 ${ganhadores} Ganhadores`}
                    </span>
                    <span className="lot-conc">#{d.numero} · {fmtData(d.dataApuracao)}</span>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
      <a href="https://loterias.caixa.gov.br" target="_blank" rel="noopener noreferrer" className="lot-caixa-link">
        Ver todos os resultados na Caixa ›
      </a>
    </div>
  )
}
