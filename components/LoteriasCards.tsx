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

const LOTERIAS = [
  { id: 'megasena',  nome: 'Mega-Sena',  cor: '#209869', glow: 'rgba(32,152,105,.30)', ballStyle: 'circle' as const, cols: 6 },
  { id: 'lotofacil', nome: 'Lotofácil',  cor: '#930089', glow: 'rgba(147,0,137,.25)',  ballStyle: 'plain'  as const, cols: 5 },
  { id: 'quina',     nome: 'Quina',      cor: '#4a3aff', glow: 'rgba(74,58,255,.25)',  ballStyle: 'circle' as const, cols: 5 },
  { id: 'lotomania', nome: 'Lotomania',  cor: '#f78100', glow: 'rgba(247,129,0,.25)',  ballStyle: 'plain'  as const, cols: 5 },
]

const MESES = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function fmtPremio(v: number) {
  if (v >= 1_000_000_000) return `R$ ${(v/1e9).toFixed(0)} bi`
  if (v >= 1_000_000) return `R$ ${(v/1e6).toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 1})} mi`
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
              style={{ '--lot-cor': lot.cor, '--lot-glow': lot.glow, borderColor: `${lot.cor}30` } as React.CSSProperties}
            >
              {/* Topo: nome + prêmio próximo */}
              <div className="lot-card-top">
                <div className="lot-card-nome" style={{ color: lot.cor }}>{lot.nome}</div>
                {d && (
                  <div className="lot-card-proximo">
                    <span className="lot-card-proximo-data">{fmtData(d.dataProximoConcurso)}</span>
                    <span className="lot-card-proximo-val">{fmtPremio(d.valorEstimadoProximoConcurso)}</span>
                  </div>
                )}
              </div>

              {/* Dezenas */}
              {loading && <div className="lot-card-loading">carregando...</div>}

              {!loading && d && (
                <>
                  <div className="lot-card-nums" style={{ gridTemplateColumns: `repeat(${lot.cols}, 1fr)` }}>
                    {d.listaDezenas.map((n, i) =>
                      lot.ballStyle === 'circle'
                        ? <span key={i} className="lot-ball" style={{ background: lot.cor, boxShadow: `0 2px 10px ${lot.glow}` }}>{n}</span>
                        : <span key={i} className="lot-plain" style={{ color: lot.cor }}>{n}</span>
                    )}
                  </div>

                  {/* Resultado + concurso */}
                  <div className="lot-card-bottom">
                    <span className={`lot-badge ${d.acumulado ? 'acc' : 'win'}`}
                      style={d.acumulado
                        ? { background: `rgba(59,130,246,.12)`, borderColor: `rgba(59,130,246,.25)`, color: '#60a5fa' }
                        : { background: `${lot.cor}18`, borderColor: `${lot.cor}40`, color: lot.cor }
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
