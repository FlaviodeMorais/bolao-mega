'use client'
import { useEffect, useState, useCallback } from 'react'
import { LOTERIA_LIST, getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'
import styles from './estat.module.css'

interface NumStat { numero: number; count: number; pct: number; atraso?: number }

const ABAS = ['Frequência Geral', 'Recentes (100)', 'Atrasos'] as const
type Aba = typeof ABAS[number]
type Estrategia = 'frequentes' | 'atrasados' | 'equilibrado' | 'aleatoria'

function gerarApostas(
  freq: NumStat[], atrasos: NumStat[], estrategia: Estrategia,
  numApostas: number, dezenasPorAposta: number, totalNumeros: number,
  filtroParidade: boolean, filtroQuadrante: boolean,
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

  const [aba, setAba]               = useState<Aba>('Frequência Geral')
  const [dados, setDados]           = useState<NumStat[]>([])
  const [freqGeral, setFreqGeral]   = useState<NumStat[]>([])
  const [atrasosDados, setAtrasosDados] = useState<NumStat[]>([])
  const [info, setInfo]             = useState<{ total: number; primeiro: number; ultimo: number } | null>(null)
  const [loading, setLoading]       = useState(true)
  const [dbVazia, setDbVazia]       = useState(false)

  const [mostrarGerador, setMostrarGerador]   = useState(false)
  const [estrategia, setEstrategia]           = useState<Estrategia>('equilibrado')
  const [numApostas, setNumApostas]           = useState(6)
  const [dezenas, setDezenas]                 = useState(cfg.minDezenas)
  const [filtroParidade, setFiltroParidade]   = useState(true)
  const [filtroQuadrante, setFiltroQuadrante] = useState(false)
  const [apostasGeradas, setApostasGeradas]   = useState<number[][]>([])
  const [gerando, setGerando]                 = useState(false)
  const [copiado, setCopiado]                 = useState(false)
  const [inserindo, setInserindo]             = useState(false)
  const [insertMsg, setInsertMsg]             = useState('')

  useEffect(() => {
    setApostasGeradas([]); setInsertMsg('')
    setDezenas(cfg.minDezenas); setAba('Frequência Geral')
  }, [loteriaId, cfg.minDezenas])

  useEffect(() => {
    setDbVazia(false); setInfo(null)
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

  useEffect(() => {
    setLoading(true)
    const qs = `?loteria=${loteriaId}`
    let url = ''
    if (aba === 'Frequência Geral') url = `/api/estatisticas/frequencia${qs}`
    if (aba === 'Recentes (100)')   url = `/api/estatisticas/frequencia${qs}&ultimos=100`
    if (aba === 'Atrasos')          url = `/api/estatisticas/atrasos${qs}`
    fetch(url).then(r => r.json()).then(d => { setDados(d.numeros || []); setLoading(false) }).catch(() => setLoading(false))
  }, [aba, loteriaId])

  const gerar = useCallback(() => {
    setGerando(true)
    setTimeout(() => {
      setApostasGeradas(gerarApostas(freqGeral, atrasosDados, estrategia, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante))
      setGerando(false); setCopiado(false); setInsertMsg('')
    }, 50)
  }, [freqGeral, atrasosDados, estrategia, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante])

  function copiarApostas() {
    const texto = apostasGeradas.map((a, i) => `Aposta ${i + 1}: ${a.map(n => String(n).padStart(2, '0')).join(' - ')}`).join('\n')
    navigator.clipboard.writeText(texto)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  function inserirNoBolao() {
    const texto = apostasGeradas.map(a => a.map(n => String(n).padStart(2, '0')).join(' ')).join('\n')
    sessionStorage.setItem('apostas_geradas', texto)
    sessionStorage.setItem('apostas_loteria', loteriaId)
    setInsertMsg('✅ Copiado! Abra o painel admin e cole no campo de apostas.')
    setInserindo(false)
  }

  const maxCount = dados.length ? Math.max(...dados.map(d => d.count || d.atraso || 1)) : 1
  const isMega = loteriaId === 'mega'

  // Cor da bola pelo rank relativo (top = cor da loteria, baixo = cinza escuro)
  const corBola = (pos: number, total: number) => {
    const pct = 1 - pos / total
    if (pct > 0.66) return cfg.cor
    if (pct > 0.33) return cfg.corSecundaria
    return 'rgba(255,255,255,0.12)'
  }
  const corTexto = (pos: number, total: number) => (1 - pos / total) > 0.33 ? '#fff' : 'rgba(255,255,255,0.5)'

  const loteriaCor = cfg.cor
  const corStyle   = { '--lot-cor': loteriaCor } as React.CSSProperties

  const ESTRATEGIAS = [
    { id: 'equilibrado' as const, label: '⚖️ Equilibrada',   desc: 'Mistura frequentes + atrasados' },
    { id: 'frequentes'  as const, label: '🔥 Mais sorteados', desc: 'Prioriza números que mais saíram' },
    { id: 'atrasados'   as const, label: '⏳ Atrasados',      desc: 'Prioriza números que não saem há mais tempo' },
    { id: 'aleatoria'   as const, label: '🎲 Aleatória',      desc: 'Geração puramente aleatória' },
  ]

  return (
    <div className={styles.page} style={corStyle}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <a href="/" className={styles.headerBack} aria-label="Voltar">
          <span className="material-icons-round" style={{ fontSize: 18 }}>arrow_back</span>
        </a>
        <div className={styles.headerBrand}>Análises & Estatísticas</div>
      </div>

      {/* ── Seletor de Loteria ── */}
      <div className={styles.loteriasRow}>
        {LOTERIA_LIST.map(l => (
          <button key={l.id} className={styles.loteriaBtn}
            onClick={() => setLoteriaId(l.id)}
            style={{
              background: loteriaId === l.id ? l.cor : 'rgba(255,255,255,0.05)',
              borderColor: loteriaId === l.id ? l.cor : 'rgba(255,255,255,0.10)',
              color: loteriaId === l.id ? '#fff' : 'rgba(255,255,255,0.4)',
            }}>
            <TrevoIcon size={16} loteria={l.id} />
            {l.label}
          </button>
        ))}
      </div>

      {/* ── Hero ── */}
      <div className={styles.hero}>
        <div className={styles.heroTitle}>
          <TrevoIcon size={22} loteria={loteriaId} />
          Análises {cfg.label}
        </div>
        {info && info.total > 0 && (
          <div className={styles.heroSub}>
            {info.total.toLocaleString('pt-BR')} concursos analisados (#{info.primeiro} ao #{info.ultimo})
          </div>
        )}
      </div>

      {/* ── DB vazia ── */}
      {dbVazia && (
        <div className={styles.secWrap}>
          <div className={styles.secCard}>
            <div className={styles.empty}>
              ⚠️ Histórico da {cfg.label} ainda não carregado.<br/>
              Acesse o painel admin → Histórico Estatístico → Carregar {cfg.label}.
            </div>
          </div>
        </div>
      )}

      {!dbVazia && (<>

        {/* ── Gerador ── */}
        <div className={styles.secWrap}>
          <button className={styles.geradorToggle} onClick={() => setMostrarGerador(v => !v)}>
            <span>🎲 Gerador de Combinações</span>
            <span>{mostrarGerador ? '▲' : '▼'}</span>
          </button>

          {mostrarGerador && (
            <div className={styles.geradorBody}>
              <div className={styles.geradorLabel}>Estratégia</div>
              <div className={styles.geradorEstrategias}>
                {ESTRATEGIAS.map(e => (
                  <button key={e.id} title={e.desc}
                    className={`${styles.geradorEstrategia} ${estrategia === e.id ? styles.geradorEstrategiaAtivo : ''}`}
                    onClick={() => setEstrategia(e.id)}>
                    {e.label}
                  </button>
                ))}
              </div>

              <div className={styles.geradorConfigRow}>
                <div className={styles.geradorConfigItem}>
                  <div className={styles.geradorLabel}>Apostas</div>
                  <div className={styles.geradorStepper}>
                    <button onClick={() => setNumApostas(n => Math.max(1, n - 1))}>−</button>
                    <span>{numApostas}</span>
                    <button onClick={() => setNumApostas(n => Math.min(20, n + 1))}>+</button>
                  </div>
                </div>
                <div className={styles.geradorConfigItem}>
                  <div className={styles.geradorLabel}>Dezenas / aposta ({cfg.minDezenas}–{cfg.maxDezenas})</div>
                  <div className={styles.geradorStepper}>
                    <button onClick={() => setDezenas(n => Math.max(cfg.minDezenas, n - 1))}>−</button>
                    <span>{dezenas}</span>
                    <button onClick={() => setDezenas(n => Math.min(cfg.maxDezenas, n + 1))}>+</button>
                  </div>
                </div>
              </div>

              {isMega && (
                <>
                  <div className={styles.geradorLabel}>Filtros</div>
                  <div className={styles.geradorFiltros}>
                    <label className={styles.geradorCheck}>
                      <input type="checkbox" checked={filtroParidade} onChange={e => setFiltroParidade(e.target.checked)} />
                      <span>Paridade equilibrada (2–4 pares)</span>
                    </label>
                    <label className={styles.geradorCheck}>
                      <input type="checkbox" checked={filtroQuadrante} onChange={e => setFiltroQuadrante(e.target.checked)} />
                      <span>Distribuição por quadrante (1 em cada faixa de 15)</span>
                    </label>
                  </div>
                </>
              )}

              <button className={styles.geradorBtn} onClick={gerar} disabled={gerando || freqGeral.length === 0}>
                {gerando ? 'Gerando...' : '✨ Gerar Combinações'}
              </button>

              {apostasGeradas.length > 0 && (
                <div className={styles.geradorResultado}>
                  <div className={styles.geradorResultadoHeader}>
                    <span className={styles.geradorLabel}>
                      {apostasGeradas.length} aposta{apostasGeradas.length !== 1 ? 's' : ''} gerada{apostasGeradas.length !== 1 ? 's' : ''}
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className={styles.geradorCopiar} onClick={copiarApostas}>
                        {copiado ? '✅ Copiado!' : '📋 Copiar'}
                      </button>
                      <button className={`${styles.geradorCopiar} ${styles.geradorCopiarPrimary}`}
                        onClick={inserirNoBolao} disabled={inserindo}>
                        📥 Inserir no bolão
                      </button>
                    </div>
                  </div>
                  {insertMsg && <div className={styles.insertMsg}>{insertMsg}</div>}
                  {apostasGeradas.map((aposta, i) => (
                    <div key={i} className={styles.geradorApostaRow}>
                      <span className={styles.geradorApostaNum}>{i + 1}</span>
                      <div className={styles.geradorApostaBalls}>
                        {aposta.map(n => (
                          <span key={n} className={styles.geradorBall} style={{ background: cfg.cor }}>
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

        {/* ── Abas ── */}
        <div className={styles.tabs}>
          {ABAS.map(a => (
            <button key={a}
              className={`${styles.tab} ${aba === a ? styles.tabAtivo : ''}`}
              onClick={() => setAba(a)}>
              {a}
            </button>
          ))}
        </div>

        {loading && <div className={styles.secWrap}><div className={styles.empty}>Carregando análise...</div></div>}

        {!loading && dados.length > 0 && (<>

          {/* Grid de bolinhas */}
          {aba !== 'Atrasos' && (
            <div className={styles.ballsWrap}>
              <div className={styles.sectionTitle}>Frequência por número</div>
              <div className={styles.ballsGrid}>
                {[...dados].sort((a, b) => a.numero - b.numero).map(d => {
                  const rank = dados.findIndex(x => x.numero === d.numero)
                  return (
                    <div key={d.numero} className={styles.ballItem}>
                      <div className={styles.ball}
                        style={{ background: corBola(rank, dados.length), color: corTexto(rank, dados.length) }}>
                        {String(d.numero).padStart(2, '0')}
                      </div>
                      <div className={styles.ballCount}>{d.count}x</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Ranking */}
          <div className={styles.secWrap}>
            <div className={styles.secCard}>
              <div className={styles.secBody}>
                <div className={styles.sectionTitle} style={{ marginBottom: 12 }}>
                  {aba === 'Atrasos' ? '🕐 Números em atraso' : '🏆 Ranking de frequência'}
                </div>
                {dados.slice(0, 20).map((d, i) => (
                  <div key={d.numero} className={styles.rankRow}>
                    <span className={styles.rankPos}>{i + 1}º</span>
                    <span className={styles.rankBall}
                      style={{ background: corBola(i, 20), color: corTexto(i, 20) }}>
                      {String(d.numero).padStart(2, '0')}
                    </span>
                    <div className={styles.rankBarWrap}>
                      <div className={styles.rankBar}
                        style={{ width: `${Math.round(((d.count || d.atraso || 0) / maxCount) * 100)}%`, background: corBola(i, 20) }} />
                    </div>
                    <span className={styles.rankVal}>
                      {aba === 'Atrasos' ? `${d.atraso} conc.` : `${d.count}x (${d.pct}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </>)}

      </>)}
    </div>
  )
}
