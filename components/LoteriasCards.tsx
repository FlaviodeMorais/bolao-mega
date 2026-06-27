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
  { id: 'megasena',  nome: 'mega-sena',  cor: '#209869', ballStyle: 'circle' as const, cols: 6 },
  { id: 'lotofacil', nome: 'lotofácil',  cor: '#930089', ballStyle: 'plain'  as const, cols: 5 },
  { id: 'quina',     nome: 'quina',      cor: '#260085', ballStyle: 'circle' as const, cols: 5 },
  { id: 'lotomania', nome: 'lotomania',  cor: '#F78100', ballStyle: 'plain'  as const, cols: 5 },
]

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS_SEMANA = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']

function fmtPremio(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function fmtDataLonga(d: string) {
  const p = d?.split('/'); if (!p || p.length < 3) return d
  const dt = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]))
  return `${DIAS_SEMANA[dt.getDay()]}, ${p[0]} de ${MESES[parseInt(p[1]) - 1]} de ${p[2]}`
}

function fmtDataCurta(d: string) {
  const p = d?.split('/'); if (!p || p.length < 3) return d
  return `${p[0]}/${p[1]}/${p[2]}`
}

// SVG clover idêntico ao da Caixa
function IconeLoteria({ id, cor }: { id: string; cor: string }) {
  if (id === 'megasena') return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill={cor}>
      <path d="M18 2C14 2 11 5 11 9c0 1.2.3 2.3.8 3.3C10.6 11.5 9.3 11 8 11c-4 0-7 3-7 7s3 7 7 7c1.3 0 2.6-.5 3.8-1.3-.5 1-.8 2.1-.8 3.3 0 4 3 7 7 7s7-3 7-7c0-1.2-.3-2.3-.8-3.3 1.2.8 2.5 1.3 3.8 1.3 4 0 7-3 7-7s-3-7-7-7c-1.3 0-2.6.5-3.8 1.3.5-1 .8-2.1.8-3.3 0-4-3-7-7-7z"/>
    </svg>
  )
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill={cor}>
      <path d="M18 2C14 2 11 5 11 9c0 1.2.3 2.3.8 3.3C10.6 11.5 9.3 11 8 11c-4 0-7 3-7 7s3 7 7 7c1.3 0 2.6-.5 3.8-1.3-.5 1-.8 2.1-.8 3.3 0 4 3 7 7 7s7-3 7-7c0-1.2-.3-2.3-.8-3.3 1.2.8 2.5 1.3 3.8 1.3 4 0 7-3 7-7s-3-7-7-7c-1.3 0-2.6.5-3.8 1.3.5-1 .8-2.1.8-3.3 0-4-3-7-7-7z"/>
    </svg>
  )
}

export default function LoteriasCards() {
  const [dados, setDados] = useState<Record<string, LotResult | null>>({})
  const [erros, setErros] = useState<Record<string, boolean>>({})

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
        } else {
          setErros(prev => ({ ...prev, [lot.id]: true }))
        }
      } catch {
        setErros(prev => ({ ...prev, [lot.id]: true }))
      }
    })
  }, [])

  return (
    <div className="caixa-widget">
      <div className="caixa-widget-titulo">Confira os últimos resultados</div>

      {LOTERIAS.map(lot => {
        const d = dados[lot.id]
        const err = erros[lot.id]
        const ganhadores = d?.listaRateioPremio?.[0]?.numeroDeGanhadores ?? null

        return (
          <div key={lot.id} className="caixa-row">
            {/* Coluna esquerda: logo + prêmio */}
            <div className="caixa-left">
              <div className="caixa-logo">
                <IconeLoteria id={lot.id} cor={lot.cor} />
                <span className="caixa-nome" style={{ color: lot.cor }}>{lot.nome}</span>
              </div>
              {d && (
                <div className="caixa-estimativa">
                  <div className="caixa-estimativa-texto">
                    Estimativa de prêmio do próximo concurso. Sorteio em {fmtDataCurta(d.dataProximoConcurso)}:
                  </div>
                  <div className="caixa-estimativa-valor" style={{ color: lot.cor }}>
                    {fmtPremio(d.valorEstimadoProximoConcurso)}
                  </div>
                </div>
              )}
            </div>

            {/* Coluna direita: números + resultado */}
            <div className="caixa-right">
              {!d && !err && <div className="caixa-loading">Carregando...</div>}
              {err && <div className="caixa-erro">Indisponível</div>}
              {d && (
                <>
                  <div
                    className="caixa-dezenas"
                    style={{ gridTemplateColumns: `repeat(${lot.cols}, 1fr)` }}
                  >
                    {d.listaDezenas.map((n, i) =>
                      lot.ballStyle === 'circle'
                        ? <span key={i} className="caixa-ball" style={{ background: lot.cor }}>{n}</span>
                        : <span key={i} className="caixa-num" style={{ color: lot.cor }}>{n}</span>
                    )}
                  </div>

                  <div className="caixa-resultado" style={{ color: '#003882' }}>
                    {d.acumulado
                      ? 'ACUMULOU!'
                      : ganhadores === 0 ? 'SEM GANHADOR'
                      : ganhadores === 1 ? '1 GANHADOR'
                      : `${ganhadores} GANHADORES`
                    }
                  </div>

                  <div className="caixa-concurso-info">
                    Concurso {d.numero} - {fmtDataLonga(d.dataApuracao)}
                  </div>

                  <a
                    href={`https://loterias.caixa.gov.br`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="caixa-link"
                  >
                    Confira o resultado ›
                  </a>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
