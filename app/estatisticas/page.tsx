'use client'
import { useEffect, useState, useCallback } from 'react'
import { LOTERIA_LIST, getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'

interface NumStat { numero: number; count: number; pct: number; atraso?: number }

const ABAS = ['Frequência Geral', 'Recentes (100)', 'Atrasos'] as const
type Aba = typeof ABAS[number]

type Estrategia = 'frequentes' | 'atrasados' | 'equilibrado' | 'aleatoria'

function gerarApostas(
  freq: NumStat[],
  atrasos: NumStat[],
  estrategia: Estrategia,
  numApostas: number,
  dezenasPorAposta: number,
  totalNumeros: number,
  filtroParidade: boolean,
  filtroQuadrante: boolean,
): number[][] {
  const scores: Record<number, number> = {}
  for (let i = 1; i <= totalNumeros; i++) scores[i] = 0

  if (estrategia === 'frequentes' || estrategia === 'equilibrado') {
    const max = Math.max(...freq.map(f => f.count), 1)
    freq.forEach(f => { scores[f.numero] = (scores[f.numero] || 0) + (f.count / max) })
  }
  if (estrategia === 'atrasados' || estrategia === 'equilibrado') {
    const maxAt = Math.max(...atrasos.map(a => a.atraso || 0), 1)
    atrasos.forEach(a => { scores[a.numero] = (scores[a.numero] || 0) + ((a.atraso || 0) / maxAt) })
  }
  if (estrategia === 'aleatoria') {
    for (let i = 1; i <= totalNumeros; i++) scores[i] = Math.random()
  }

  const apostas: number[][] = []
  let tentativas = 0

  while (apostas.length < numApostas && tentativas < 3000) {
    tentativas++
    const pool = Array.from({ length: totalNumeros }, (_, i) => i + 1)
    const selecionados: number[] = []

    while (selecionados.length < dezenasPorAposta) {
      const disponiveis = pool.filter(n => !selecionados.includes(n))
      const totalScore = disponiveis.reduce((s, n) => s + (scores[n] || 0) + 0.1, 0)
      let r = Math.random() * totalScore
      for (const n of disponiveis) {
        r -= (scores[n] || 0) + 0.1
        if (r <= 0) { selecionados.push(n); break }
      }
    }

    const aposta = selecionados.sort((a, b) => a - b)

    // Filtros só se aplicam à Mega-Sena (6 dezenas de 60)
    if (filtroParidade && totalNumeros === 60 && dezenasPorAposta === 6) {
      const pares = aposta.filter(n => n % 2 === 0).length
      if (pares < 2 || pares > 4) continue
    }
    if (filtroQuadrante && totalNumeros === 60 && dezenasPorAposta === 6) {
      const q = [0, 0, 0, 0]
      aposta.forEach(n => { q[Math.floor((n - 1) / 15)]++ })
      if (q.some(v => v === 0)) continue
    }

    const chave = aposta.join('-')
    if (!apostas.some(a => a.join('-') === chave)) apostas.push(aposta)
  }

  return apostas
}

export default function EstatisticasPage() {
  const [loteriaId, setLoteriaId] = useState<LoteriaId>('mega')
  const cfg = getLoteria(loteriaId)

  const [aba, setAba]           = useState<Aba>('Frequência Geral')
  const [dados, setDados]       = useState<NumStat[]>([])
  const [freqGeral, setFreqGeral]     = useState<NumStat[]>([])
  const [atrasosDados, setAtrasosDados] = useState<NumStat[]>([])
  const [info, setInfo]         = useState<{ total: number; primeiro: number; ultimo: number } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [dbVazia, setDbVazia]   = useState(false)

  // Gerador
  const [mostrarGerador, setMostrarGerador] = useState(false)
  const [estrategia, setEstrategia]         = useState<Estrategia>('equilibrado')
  const [numApostas, setNumApostas]         = useState(6)
  const [dezenas, setDezenas]               = useState(cfg.minDezenas)
  const [filtroParidade, setFiltroParidade] = useState(true)
  const [filtroQuadrante, setFiltroQuadrante] = useState(false)
  const [apostasGeradas, setApostasGeradas] = useState<number[][]>([])
  const [gerando, setGerando]               = useState(false)
  const [copiado, setCopiado]               = useState(false)
  const [inserindo, setInserindo]           = useState(false)
  const [insertMsg, setInsertMsg]           = useState('')

  // Reset ao mudar loteria
  useEffect(() => {
    setApostasGeradas([])
    setInsertMsg('')
    setDezenas(cfg.minDezenas)
    setAba('Frequência Geral')
  }, [loteriaId, cfg.minDezenas])

  // Carrega info + freq + atrasos ao mudar loteria
  useEffect(() => {
    setDbVazia(false)
    setInfo(null)

    const qs = `?loteria=${loteriaId}`
    Promise.all([
      fetch(`/api/estatisticas/info${qs}`).then(r => r.json()),
      fetch(`/api/estatisticas/frequencia${qs}`).then(r => r.json()),
      fetch(`/api/estatisticas/atrasos${qs}`).then(r => r.json()),
    ]).then(([inf, fr, at]) => {
      setInfo(inf)
      setDbVazia(!inf.total || inf.total < 10)
      setFreqGeral(fr.numeros || [])
      setAtrasosDados(at.numeros || [])
    })
  }, [loteriaId])

  // Carrega dados da aba ativa
  useEffect(() => {
    setLoading(true)
    const qs = `?loteria=${loteriaId}`
    let url = ''
    if (aba === 'Frequência Geral') url = `/api/estatisticas/frequencia${qs}`
    if (aba === 'Recentes (100)')   url = `/api/estatisticas/frequencia${qs}&ultimos=100`
    if (aba === 'Atrasos')          url = `/api/estatisticas/atrasos${qs}`

    fetch(url).then(r => r.json()).then(d => {
      setDados(d.numeros || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [aba, loteriaId])

  const gerar = useCallback(() => {
    setGerando(true)
    setTimeout(() => {
      const resultado = gerarApostas(
        freqGeral, atrasosDados, estrategia, numApostas, dezenas,
        cfg.totalNumeros, filtroParidade, filtroQuadrante,
      )
      setApostasGeradas(resultado)
      setGerando(false)
      setCopiado(false)
      setInsertMsg('')
    }, 50)
  }, [freqGeral, atrasosDados, estrategia, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante])

  function copiarApostas() {
    const texto = apostasGeradas.map((a, i) =>
      `Aposta ${i + 1}: ${a.map(n => String(n).padStart(2, '0')).join(' - ')}`
    ).join('\n')
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  async function inserirNoBolao() {
    const texto = apostasGeradas.map(a => a.map(n => String(n).padStart(2, '0')).join(' ')).join('\n')
    // Salva no sessionStorage para o admin pegar
    sessionStorage.setItem('apostas_geradas', texto)
    sessionStorage.setItem('apostas_loteria', loteriaId)
    setInsertMsg('✅ Copiado! Abra o painel admin e cole no campo de apostas.')
    setInserindo(false)
  }

  const maxCount = dados.length ? Math.max(...dados.map(d => d.count || d.atraso || 1)) : 1
  const isMega = loteriaId === 'mega'

  const corBola = (pos: number, total: number) => {
    const pct = 1 - pos / total
    if (pct > 0.66) return cfg.cor
    if (pct > 0.33) return cfg.corSecundaria
    return '#CBD5E1'
  }
  const corTexto = (pos: number, total: number) => {
    return (1 - pos / total) > 0.33 ? '#fff' : '#0D1B2A'
  }

  return (
    <div className="page-wrap">
      <div className="site-header">
        <a href="/" className="header-link"><span className="material-icons-round">arrow_back</span></a>
        <div className="header-brand"><span className="brand">Estatísticas</span></div>
        <div style={{ width: 40 }} />
      </div>

      {/* Seletor de Loteria */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {LOTERIA_LIST.map(l => (
          <button
            key={l.id}
            onClick={() => setLoteriaId(l.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 20, border: `2px solid ${loteriaId === l.id ? l.cor : '#E2E8F0'}`,
              background: loteriaId === l.id ? l.cor : '#fff',
              color: loteriaId === l.id ? '#fff' : '#0D1B2A',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all .2s',
            }}
          >
            <TrevoIcon size={16} loteria={l.id} />
            {l.label}
          </button>
        ))}
      </div>

      <div className="estat-hero">
        <div className="estat-hero-title" style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <TrevoIcon size={22} loteria={loteriaId} />
          Análises {cfg.label}
        </div>
        {info && info.total > 0 && (
          <div className="estat-hero-sub">
            {info.total.toLocaleString('pt-BR')} concursos analisados (#{info.primeiro} ao #{info.ultimo})
          </div>
        )}
      </div>

      {dbVazia && (
        <div className="card" style={{ margin: '16px' }}>
          <div className="form-body">
            <div className="bolao-nao-config">
              ⚠️ Histórico da {cfg.label} ainda não carregado.<br/>
              Acesse o painel admin → Histórico Estatístico → Carregar {cfg.label}.
            </div>
          </div>
        </div>
      )}

      {!dbVazia && (
        <>
          {/* ── GERADOR ── */}
          <div className="gerador-wrap">
            <button className="gerador-toggle" onClick={() => setMostrarGerador(v => !v)}>
              🎲 Gerador de Combinações {mostrarGerador ? '▲' : '▼'}
            </button>

            {mostrarGerador && (
              <div className="gerador-body">
                <div className="gerador-section">
                  <div className="gerador-label">Estratégia</div>
                  <div className="gerador-estrategias">
                    {([
                      { id: 'equilibrado', label: '⚖️ Equilibrada',   desc: 'Mistura frequentes + atrasados' },
                      { id: 'frequentes',  label: '🔥 Mais sorteados', desc: 'Prioriza números que mais saíram' },
                      { id: 'atrasados',   label: '⏳ Atrasados',      desc: 'Prioriza números que não saem há mais tempo' },
                      { id: 'aleatoria',   label: '🎲 Aleatória',      desc: 'Geração puramente aleatória' },
                    ] as const).map(e => (
                      <button key={e.id}
                        className={`gerador-estrategia${estrategia === e.id ? ' ativo' : ''}`}
                        onClick={() => setEstrategia(e.id)}
                        title={e.desc}
                      >{e.label}</button>
                    ))}
                  </div>
                </div>

                <div className="gerador-config-row">
                  <div className="gerador-config-item">
                    <label className="gerador-label">Apostas</label>
                    <div className="gerador-stepper">
                      <button onClick={() => setNumApostas(n => Math.max(1, n - 1))}>−</button>
                      <span>{numApostas}</span>
                      <button onClick={() => setNumApostas(n => Math.min(20, n + 1))}>+</button>
                    </div>
                  </div>
                  <div className="gerador-config-item">
                    <label className="gerador-label">Dezenas / aposta ({cfg.minDezenas}–{cfg.maxDezenas})</label>
                    <div className="gerador-stepper">
                      <button onClick={() => setDezenas(n => Math.max(cfg.minDezenas, n - 1))}>−</button>
                      <span>{dezenas}</span>
                      <button onClick={() => setDezenas(n => Math.min(cfg.maxDezenas, n + 1))}>+</button>
                    </div>
                  </div>
                </div>

                {/* Filtros — só Mega-Sena 6 dezenas */}
                {isMega && (
                  <div className="gerador-section">
                    <div className="gerador-label">Filtros</div>
                    <div className="gerador-filtros">
                      <label className="gerador-check">
                        <input type="checkbox" checked={filtroParidade} onChange={e => setFiltroParidade(e.target.checked)} />
                        <span>Paridade equilibrada (2–4 pares)</span>
                      </label>
                      <label className="gerador-check">
                        <input type="checkbox" checked={filtroQuadrante} onChange={e => setFiltroQuadrante(e.target.checked)} />
                        <span>Distribuição por quadrante (1 em cada faixa de 15)</span>
                      </label>
                    </div>
                  </div>
                )}

                <button className="gerador-btn" onClick={gerar} disabled={gerando || freqGeral.length === 0}>
                  {gerando ? 'Gerando...' : '✨ Gerar Combinações'}
                </button>

                {apostasGeradas.length > 0 && (
                  <div className="gerador-resultado">
                    <div className="gerador-resultado-header">
                      <span className="gerador-label">
                        {apostasGeradas.length} aposta{apostasGeradas.length !== 1 ? 's' : ''} gerada{apostasGeradas.length !== 1 ? 's' : ''}
                      </span>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="gerador-copiar" onClick={copiarApostas}>
                          {copiado ? '✅ Copiado!' : '📋 Copiar'}
                        </button>
                        <button
                          className="gerador-copiar"
                          style={{ background: inserindo ? '#94A3B8' : '#009B63', color: '#fff' }}
                          onClick={inserirNoBolao}
                          disabled={inserindo}
                        >
                          📥 Inserir no bolão
                        </button>
                      </div>
                    </div>
                    {insertMsg && (
                      <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, fontSize: 13, color: '#166534', marginBottom: 8 }}>
                        {insertMsg}
                      </div>
                    )}
                    {apostasGeradas.map((aposta, i) => (
                      <div key={i} className="gerador-aposta-row">
                        <span className="gerador-aposta-num">{i + 1}</span>
                        <div className="gerador-aposta-balls">
                          {aposta.map(n => (
                            <span key={n} className="gerador-ball" style={{ background: cfg.cor }}>
                              {String(n).padStart(2, '0')}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Abas */}
          <div className="estat-tabs">
            {ABAS.map(a => (
              <button key={a} className={`estat-tab${aba === a ? ' ativo' : ''}`} onClick={() => setAba(a)}>{a}</button>
            ))}
          </div>

          {loading && <div className="p-empty">Carregando análise...</div>}

          {!loading && dados.length > 0 && (
            <>
              {aba !== 'Atrasos' && (
                <div className="estat-balls-wrap">
                  <div className="estat-section-title">Frequência por número</div>
                  <div className="estat-balls-grid">
                    {[...dados].sort((a, b) => a.numero - b.numero).map((d) => {
                      const rank = dados.findIndex(x => x.numero === d.numero)
                      return (
                        <div key={d.numero} className="estat-ball-item">
                          <div className="estat-ball" style={{ background: corBola(rank, dados.length), color: corTexto(rank, dados.length) }}>
                            {String(d.numero).padStart(2, '0')}
                          </div>
                          <div className="estat-ball-count">{d.count}x</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="card" style={{ margin: '0 16px 16px' }}>
                <div className="form-body" style={{ padding: '16px' }}>
                  <div className="estat-section-title" style={{ marginBottom: 12 }}>
                    {aba === 'Atrasos' ? '🕐 Números em atraso' : '🏆 Ranking de frequência'}
                  </div>
                  {dados.slice(0, 20).map((d, i) => (
                    <div key={d.numero} className="estat-rank-row">
                      <span className="estat-rank-pos">{i + 1}º</span>
                      <span className="estat-rank-ball" style={{ background: corBola(i, 20), color: corTexto(i, 20) }}>
                        {String(d.numero).padStart(2, '0')}
                      </span>
                      <div className="estat-rank-bar-wrap">
                        <div className="estat-rank-bar" style={{
                          width: `${Math.round(((d.count || d.atraso || 0) / maxCount) * 100)}%`,
                          background: corBola(i, 20),
                        }} />
                      </div>
                      <span className="estat-rank-val">
                        {aba === 'Atrasos' ? `${d.atraso} conc.` : `${d.count}x (${d.pct}%)`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
