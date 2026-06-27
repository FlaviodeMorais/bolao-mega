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
  listaRateioPremio: { descricaoFaixa: string; numeroDeGanhadores: number; valorPremio: number }[]
}

interface Loteria {
  id: string
  nome: string
  cor: string
  corText: string
  icone: string
  ballStyle: 'circle' | 'plain'
  cols: number
}

const LOTERIAS: Loteria[] = [
  { id: 'megasena',  nome: 'mega-sena',  cor: '#209869', corText: '#fff', icone: '🍀', ballStyle: 'circle', cols: 6 },
  { id: 'lotofacil', nome: 'lotofácil',  cor: '#930089', corText: '#fff', icone: '🎯', ballStyle: 'plain',  cols: 5 },
  { id: 'quina',     nome: 'quina',      cor: '#260085', corText: '#fff', icone: '⭐', ballStyle: 'circle', cols: 5 },
  { id: 'lotomania', nome: 'lotomania',  cor: '#F78100', corText: '#fff', icone: '🔢', ballStyle: 'plain',  cols: 5 },
]

function fmt(valor: number) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

function fmtData(d: string) {
  // DD/MM/YYYY → "DD de Mês de YYYY"
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const parts = d?.split('/')
  if (!parts || parts.length < 3) return d
  return `${parts[0]} de ${meses[parseInt(parts[1]) - 1]} de ${parts[2]}`
}

function diasSemana(d: string) {
  const parts = d?.split('/')
  if (!parts || parts.length < 3) return ''
  const dt = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]))
  return ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'][dt.getDay()]
}

export default function LoteriasCards() {
  const [dados, setDados] = useState<Record<string, LotResult | null>>({})
  const [erros, setErros] = useState<Record<string, boolean>>({})

  useEffect(() => {
    LOTERIAS.forEach(async (lot) => {
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 8000)
        const r = await fetch(`${BASE}/${lot.id}`, { cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) {
          const d: LotResult = await r.json()
          setDados(prev => ({ ...prev, [lot.id]: d }))
        } else {
          setErros(prev => ({ ...prev, [lot.id]: true }))
        }
      } catch {
        setErros(prev => ({ ...prev, [lot.id]: true }))
      }
    })
  }, [])

  return (
    <div className="loterias-section">
      <div className="loterias-titulo">🏆 Últimos Resultados</div>
      <div className="loterias-grid">
        {LOTERIAS.map(lot => {
          const d = dados[lot.id]
          const erro = erros[lot.id]

          // Número de ganhadores (faixa principal = index 0)
          const ganhadores = d?.listaRateioPremio?.[0]?.numeroDeGanhadores ?? null

          return (
            <div key={lot.id} className="lot-card">
              {/* Header */}
              <div className="lot-card-header" style={{ borderColor: lot.cor }}>
                <div className="lot-card-logo">
                  <span className="lot-card-icone" style={{ color: lot.cor }}>{lot.icone}</span>
                  <span className="lot-card-nome" style={{ color: lot.cor }}>{lot.nome}</span>
                </div>
                {d && (
                  <div className="lot-card-meta">
                    <div className="lot-card-meta-label">Próximo sorteio em {fmtData(d.dataProximoConcurso)}:</div>
                    <div className="lot-card-premio" style={{ color: lot.cor }}>
                      {fmt(d.valorEstimadoProximoConcurso)}
                    </div>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="lot-card-body">
                {!d && !erro && (
                  <div className="lot-card-loading">Carregando...</div>
                )}
                {erro && (
                  <div className="lot-card-erro">Indisponível no momento</div>
                )}
                {d && (
                  <>
                    {/* Dezenas */}
                    <div
                      className="lot-dezenas"
                      style={{
                        gridTemplateColumns: `repeat(${lot.cols}, 1fr)`,
                      }}
                    >
                      {d.listaDezenas.map((n, i) => (
                        lot.ballStyle === 'circle'
                          ? <span key={i} className="lot-ball" style={{ background: lot.cor }}>{n}</span>
                          : <span key={i} className="lot-num" style={{ color: lot.cor }}>{n}</span>
                      ))}
                    </div>

                    {/* Resultado */}
                    {d.acumulado
                      ? <div className="lot-acumulou" style={{ color: '#1D6EA6' }}>ACUMULOU!</div>
                      : ganhadores != null && (
                          <div className="lot-ganhadores" style={{ color: '#1D6EA6' }}>
                            {ganhadores} {ganhadores === 1 ? 'GANHADOR' : 'GANHADORES'}
                          </div>
                        )
                    }

                    {/* Concurso e data */}
                    <div className="lot-concurso-info">
                      Concurso {d.numero} — {diasSemana(d.dataApuracao)}, {fmtData(d.dataApuracao)}
                    </div>
                    <a
                      href={`https://loterias.caixa.gov.br/Paginas/${lot.id === 'megasena' ? 'Mega-Sena' : lot.id.charAt(0).toUpperCase() + lot.id.slice(1)}.aspx`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lot-link"
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
    </div>
  )
}
