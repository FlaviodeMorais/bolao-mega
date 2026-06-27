'use client'
import { useEffect, useState, useCallback } from 'react'

interface NumStat { numero: number; count: number; pct: number; atraso?: number }

const ABAS = ['Frequência Geral', 'Recentes (100)', 'Atrasos'] as const
type Aba = typeof ABAS[number]

type Estrategia = 'frequentes' | 'atrasados' | 'equilibrado' | 'aleatoria'

// Gera N apostas de K dezenas com base nos scores
function gerarApostas(
  freq: NumStat[],
  atrasos: NumStat[],
  estrategia: Estrategia,
  numApostas: number,
  dezenasPorAposta: number,
  filtroParidade: boolean,
  filtroQuadrante: boolean,
): number[][] {
  const scores: Record<number, number> = {}
  for (let i = 1; i <= 60; i++) scores[i] = 0

  if (estrategia === 'frequentes' || estrategia === 'equilibrado') {
    const max = Math.max(...freq.map(f => f.count))
    freq.forEach(f => { scores[f.numero] = (scores[f.numero] || 0) + (f.count / max) })
  }
  if (estrategia === 'atrasados' || estrategia === 'equilibrado') {
    const maxAt = Math.max(...atrasos.map(a => a.atraso || 0))
    atrasos.forEach(a => { scores[a.numero] = (scores[a.numero] || 0) + ((a.atraso || 0) / maxAt) })
  }
  if (estrategia === 'aleatoria') {
    for (let i = 1; i <= 60; i++) scores[i] = Math.random()
  }

  const apostas: number[][] = []
  let tentativas = 0

  while (apostas.length < numApostas && tentativas < 2000) {
    tentativas++
    // Seleção por peso (roulette wheel)
    const pool = Array.from({ length: 60 }, (_, i) => i + 1)
    const selecionados: number[] = []

    while (selecionados.length < dezenasPorAposta) {
      const totalScore = pool.filter(n => !selecionados.includes(n)).reduce((s, n) => s + (scores[n] || 0) + 0.1, 0)
      let r = Math.random() * totalScore
      for (const n of pool.filter(n => !selecionados.includes(n))) {
        r -= (scores[n] || 0) + 0.1
        if (r <= 0) { selecionados.push(n); break }
      }
    }

    const aposta = selecionados.sort((a, b) => a - b)

    // Filtro paridade: entre 2 e 4 pares
    if (filtroParidade) {
      const pares = aposta.filter(n => n % 2 === 0).length
      if (pares < 2 || pares > 4) continue
    }

    // Filtro quadrante: ao menos 1 número em cada quadrante (1-15, 16-30, 31-45, 46-60)
    if (filtroQuadrante) {
      const q = [0, 0, 0, 0]
      aposta.forEach(n => { q[Math.floor((n - 1) / 15)]++ })
      if (q.some(v => v === 0)) continue
    }

    // Evitar apostas duplicadas
    const chave = aposta.join('-')
    if (!apostas.some(a => a.join('-') === chave)) apostas.push(aposta)
  }

  return apostas
}

export default function EstatisticasPage() {
  const [aba, setAba]           = useState<Aba>('Frequência Geral')
  const [dados, setDados]       = useState<NumStat[]>([])
  const [freqGeral, setFreqGeral] = useState<NumStat[]>([])
  const [atrasosDados, setAtrasosDados] = useState<NumStat[]>([])
  const [info, setInfo]         = useState<{ total: number; primeiro: number; ultimo: number } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [dbVazia, setDbVazia]   = useState(false)

  // Gerador
  const [mostrarGerador, setMostrarGerador] = useState(false)
  const [estrategia, setEstrategia]         = useState<Estrategia>('equilibrado')
  const [numApostas, setNumApostas]         = useState(6)
  const [dezenas, setDezenas]               = useState(6)
  const [filtroParidade, setFiltroParidade] = useState(true)
  const [filtroQuadrante, setFiltroQuadrante] = useState(false)
  const [apostasGeradas, setApostasGeradas] = useState<number[][]>([])
  const [gerando, setGerando]               = useState(false)
  const [copiado, setCopiado]               = useState(false)

  useEffect(() => {
    fetch('/api/estatisticas/info').then(r => r.json()).then(d => {
      setInfo(d)
      setDbVazia(!d.total || d.total < 10)
    })
    // Pré-carrega freq e atrasos para o gerador
    fetch('/api/estatisticas/frequencia').then(r => r.json()).then(d => setFreqGeral(d.numeros || []))
    fetch('/api/estatisticas/atrasos').then(r => r.json()).then(d => setAtrasosDados(d.numeros || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let url = ''
    if (aba === 'Frequência Geral')  url = '/api/estatisticas/frequencia'
    if (aba === 'Recentes (100)')    url = '/api/estatisticas/frequencia?ultimos=100'
    if (aba === 'Atrasos')           url = '/api/estatisticas/atrasos'

    fetch(url).then(r => r.json()).then(d => {
      setDados(d.numeros || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [aba])

  const gerar = useCallback(() => {
    setGerando(true)
    setTimeout(() => {
      const resultado = gerarApostas(freqGeral, atrasosDados, estrategia, numApostas, dezenas, filtroParidade, filtroQuadrante)
      setApostasGeradas(resultado)
      setGerando(false)
      setCopiado(false)
    }, 50)
  }, [freqGeral, atrasosDados, estrategia, numApostas, dezenas, filtroParidade, filtroQuadrante])

  function copiarApostas() {
    const texto = apostasGeradas.map((a, i) =>
      `Aposta ${i + 1}: ${a.map(n => String(n).padStart(2, '0')).join(' - ')}`
    ).join('\n')
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const maxCount = dados.length ? Math.max(...dados.map(d => d.count || d.atraso || 1)) : 1

  const corBola = (pos: number, total: number) => {
    const pct = 1 - pos / total
    if (pct > 0.66) return '#00AB67'
    if (pct > 0.33) return '#1D6EA6'
    return '#94A3B8'
  }

  return (
    <div className="page-wrap">
      <div className="site-header">
        <a href="/" className="header-link"><span className="material-icons-round">arrow_back</span></a>
        <div className="header-brand"><span className="brand">Estatísticas</span></div>
        <div style={{ width: 40 }} />
      </div>

      <div className="estat-hero">
        <div className="estat-hero-title">📊 Análises Mega-Sena</div>
        {info && <div className="estat-hero-sub">{info.total.toLocaleString('pt-BR')} concursos analisados (#{info.primeiro} ao #{info.ultimo})</div>}
      </div>

      {dbVazia && (
        <div className="card" style={{ margin: '16px' }}>
          <div className="form-body">
            <div className="bolao-nao-config">⚠️ Histórico ainda não carregado. Acesse o painel admin → Histórico Estatístico.</div>
          </div>
        </div>
      )}

      {!dbVazia && (
        <>
          {/* ── GERADOR DE COMBINAÇÕES ── */}
          <div className="gerador-wrap">
            <button className="gerador-toggle" onClick={() => setMostrarGerador(v => !v)}>
              🎲 Gerador de Combinações {mostrarGerador ? '▲' : '▼'}
            </button>

            {mostrarGerador && (
              <div className="gerador-body">
                {/* Estratégia */}
                <div className="gerador-section">
                  <div className="gerador-label">Estratégia</div>
                  <div className="gerador-estrategias">
                    {([
                      { id: 'equilibrado', label: '⚖️ Equilibrada',  desc: 'Mistura frequentes + atrasados' },
                      { id: 'frequentes',  label: '🔥 Mais sorteados', desc: 'Prioriza números que mais saíram' },
                      { id: 'atrasados',   label: '⏳ Atrasados',     desc: 'Prioriza números que não saem há mais tempo' },
                      { id: 'aleatoria',   label: '🎲 Aleatória',     desc: 'Geração puramente aleatória' },
                    ] as const).map(e => (
                      <button key={e.id}
                        className={`gerador-estrategia${estrategia === e.id ? ' ativo' : ''}`}
                        onClick={() => setEstrategia(e.id)}
                        title={e.desc}
                      >{e.label}</button>
                    ))}
                  </div>
                </div>

                {/* Config */}
                <div className="gerador-config-row">
                  <div className="gerador-config-item">
                    <label className="gerador-label">Apostas</label>
                    <div className="gerador-stepper">
                      <button onClick={() => setNumApostas(n => Math.max(1, n-1))}>−</button>
                      <span>{numApostas}</span>
                      <button onClick={() => setNumApostas(n => Math.min(20, n+1))}>+</button>
                    </div>
                  </div>
                  <div className="gerador-config-item">
                    <label className="gerador-label">Dezenas / aposta</label>
                    <div className="gerador-stepper">
                      <button onClick={() => setDezenas(n => Math.max(6, n-1))}>−</button>
                      <span>{dezenas}</span>
                      <button onClick={() => setDezenas(n => Math.min(15, n+1))}>+</button>
                    </div>
                  </div>
                </div>

                {/* Filtros */}
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

                <button className="gerador-btn" onClick={gerar} disabled={gerando || freqGeral.length === 0}>
                  {gerando ? 'Gerando...' : '✨ Gerar Combinações'}
                </button>

                {/* Resultado */}
                {apostasGeradas.length > 0 && (
                  <div className="gerador-resultado">
                    <div className="gerador-resultado-header">
                      <span className="gerador-label">{apostasGeradas.length} aposta{apostasGeradas.length !== 1 ? 's' : ''} gerada{apostasGeradas.length !== 1 ? 's' : ''}</span>
                      <button className="gerador-copiar" onClick={copiarApostas}>
                        {copiado ? '✅ Copiado!' : '📋 Copiar tudo'}
                      </button>
                    </div>
                    {apostasGeradas.map((aposta, i) => (
                      <div key={i} className="gerador-aposta-row">
                        <span className="gerador-aposta-num">{i + 1}</span>
                        <div className="gerador-aposta-balls">
                          {aposta.map(n => (
                            <span key={n} className="gerador-ball">{String(n).padStart(2, '0')}</span>
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
                          <div className="estat-ball" style={{ background: corBola(rank, dados.length) }}>
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
                      <span className="estat-rank-ball" style={{ background: corBola(i, 20) }}>
                        {String(d.numero).padStart(2, '0')}
                      </span>
                      <div className="estat-rank-bar-wrap">
                        <div className="estat-rank-bar" style={{ width: `${Math.round(((d.count || d.atraso || 0) / maxCount) * 100)}%`, background: corBola(i, 20) }} />
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
