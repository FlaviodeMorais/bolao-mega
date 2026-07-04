'use client'
import { useState, useRef, useEffect } from 'react'
import styles from '@/app/admin/admin.module.css'
import { LOTERIA_LIST, getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'

// Totais de fallback (usados só se a busca do concurso atual falhar)
const TOTAIS_FALLBACK: Record<LoteriaId, number> = { mega: 3024, lotofacil: 3100, quina: 6400 }

// URL da API Caixa por loteria
const CAIXA_URL: Record<LoteriaId, string> = {
  mega:      'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena',
  lotofacil: 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil',
  quina:     'https://servicebus2.caixa.gov.br/portaldeloterias/api/quina',
}

interface Linha { concurso: number; dezenas: number[]; data_sorteio: string | null }
interface NumStat { numero: number; count: number; pct: number; atraso?: number }

export default function IngerirHistorico() {
  const [loteria, setLoteria]       = useState<LoteriaId>('mega')
  const [rodando, setRodando]       = useState(false)
  const [pct, setPct]               = useState(0)
  const [resumo, setResumo]         = useState('')
  const [info, setInfo]             = useState<Record<LoteriaId, string | null>>({ mega: null, lotofacil: null, quina: null })
  const [verificando, setVerif]     = useState(false)
  const [totais, setTotais]         = useState<Record<LoteriaId, number>>(TOTAIS_FALLBACK)
  const abortRef                    = useRef(false)

  // Estatísticas (Frequência / Atrasos / Top 15) da loteria selecionada
  const [freqDados, setFreqDados]       = useState<NumStat[]>([])
  const [atrasosDados, setAtrasosDados] = useState<NumStat[]>([])
  const [infoTotal, setInfoTotal]       = useState<number | null>(null)
  const [loadingEstat, setLoadingEstat] = useState(false)

  // Combinações & Sequências
  const [combDistrib, setCombDistrib]         = useState<{ tamanho: string; count: number; pct: number }[]>([])
  const [combDuplas, setCombDuplas]           = useState<{ par: [number, number]; count: number; pct: number }[]>([])
  const [combTrincas, setCombTrincas]         = useState<{ trio: [number, number, number]; count: number; pct: number }[]>([])
  const [combDuplasConsec, setCombDuplasConsec]   = useState<{ par: [number, number]; count: number; pct: number }[]>([])
  const [combTrincasConsec, setCombTrincasConsec] = useState<{ trio: [number, number, number]; count: number; pct: number }[]>([])
  const [combSoma, setCombSoma]         = useState<{ media: number; min: number; max: number } | null>(null)
  const [loadingComb, setLoadingComb]   = useState(false)

  useEffect(() => {
    setLoadingEstat(true)
    Promise.all([
      fetch(`/api/estatisticas/frequencia?loteria=${loteria}`).then(r => r.json()),
      fetch(`/api/estatisticas/atrasos?loteria=${loteria}`).then(r => r.json()),
      fetch(`/api/estatisticas/info?loteria=${loteria}`).then(r => r.json()),
    ]).then(([f, a, i]) => {
      setFreqDados(f.numeros || [])
      setAtrasosDados(a.numeros || [])
      setInfoTotal(i?.total ?? null)
      setLoadingEstat(false)
    }).catch(() => setLoadingEstat(false))

    setLoadingComb(true)
    fetch(`/api/estatisticas/combinacoes?loteria=${loteria}`).then(r => r.json()).then(c => {
      setCombDistrib(c.distribuicaoSequencia || [])
      setCombDuplas(c.duplasFrequentes || [])
      setCombTrincas(c.trincasFrequentes || [])
      setCombDuplasConsec(c.duplasConsecutivas || [])
      setCombTrincasConsec(c.trincasConsecutivas || [])
      setCombSoma(c.soma || null)
      setLoadingComb(false)
    }).catch(() => setLoadingComb(false))
  }, [loteria])

  useEffect(() => {
    Promise.all(
      LOTERIA_LIST.map(l =>
        fetch(`/api/resultados/${getLoteria(l.id).apiSlug}`).then(r => r.json()).catch(() => null)
      )
    ).then(results => {
      setTotais(prev => {
        const novo = { ...prev }
        LOTERIA_LIST.forEach((l, i) => {
          const num = results[i]?.numero
          if (typeof num === 'number' && num > 0) novo[l.id] = num
        })
        return novo
      })
    })
  }, [])

  async function verificar() {
    setVerif(true)
    const results = await Promise.all(
      LOTERIA_LIST.map(l =>
        fetch(`/api/estatisticas/info?loteria=${l.id}`).then(r => r.json()).catch(() => null)
      )
    )
    const novo: Record<string, string | null> = {}
    LOTERIA_LIST.forEach((l, i) => {
      const r = results[i]
      novo[l.id] = r?.total > 0
        ? `${r.total.toLocaleString('pt-BR')} concursos (${r.primeiro}–${r.ultimo})`
        : 'Banco vazio'
    })
    setInfo(novo as Record<LoteriaId, string | null>)
    setVerif(false)
  }

  async function iniciar() {
    abortRef.current = false
    setRodando(true); setPct(0)
    const total    = totais[loteria]
    const baseUrl  = CAIXA_URL[loteria]
    const cfg      = getLoteria(loteria)
    let inseridos  = 0
    let erros      = 0
    let buffer: Linha[] = []
    setResumo('Iniciando...')

    for (let n = 1; n <= total; n++) {
      if (abortRef.current) { setResumo(`⏹ Parado em #${n}. ${inseridos} inseridos.`); break }

      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 6000)
        const r = await fetch(`${baseUrl}/${n}`, { cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) {
          const d = await r.json()
          const dez = (d.listaDezenas || d.dezenas || []).map(Number)
          if (dez.length === cfg.minDezenas) {
            buffer.push({ concurso: n, dezenas: dez, data_sorteio: d.dataApuracao || null })
          } else erros++
        } else erros++
      } catch { erros++ }

      if (buffer.length >= 50 || n === total) {
        if (buffer.length > 0) {
          try {
            const res = await fetch('/api/admin/salvar-historico', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linhas: buffer, loteria }),
            }).then(r => r.json())
            if (res.ok) inseridos += buffer.length
            else erros += buffer.length
          } catch { erros += buffer.length }
          buffer = []
        }
        setPct(Math.round((n / total) * 100))
        setResumo(`#${n} de ${total} — ${inseridos} salvos, ${erros} erros`)
      }
    }

    if (!abortRef.current) {
      const nota = erros > 0 ? ` (erros normais: concursos antigos sem dados na API da Caixa)` : ''
      setResumo(`✅ Concluído: ${inseridos} inseridos, ${erros} erros.${nota}`)
    }
    setRodando(false)
    verificar()
  }

  const cfg = getLoteria(loteria)

  // Preenchimento por rank: top = cor sólida, meio = cor secundária, baixo = glass
  const corBola = (pos: number, total: number) => {
    const pct = 1 - pos / total
    if (pct > 0.66) return cfg.cor
    if (pct > 0.33) return cfg.corSecundaria
    return `${cfg.cor}22`
  }
  const corBorda = (pos: number, total: number) => {
    const pct = 1 - pos / total
    if (pct > 0.66) return 'transparent'
    if (pct > 0.33) return 'transparent'
    return `${cfg.cor}55`
  }
  const corTexto = (pos: number, total: number) => {
    const pct = 1 - pos / total
    return pct > 0.33 ? '#fff' : cfg.cor
  }
  const maxFreq   = freqDados.length ? Math.max(...freqDados.map(d => d.count || 1)) : 1
  // Nº de colunas da grade de números escala com a quantidade de dezenas da loteria,
  // mirando ~15 linhas pra alinhar com as colunas de Top 15/Atrasos (sempre 15 linhas fixas).
  const freqGridCols = Math.max(1, Math.round(cfg.totalNumeros / 15))
  const maxAtraso = atrasosDados.length ? Math.max(...atrasosDados.map(d => d.atraso || 1)) : 1

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🗄️ Histórico Estatístico</div>

      {/* Status por loteria */}
      <div className={styles.ferrSection}>
        <div className={`${styles.detStatsRow} ${styles.detStatsRow3}`}>
          {LOTERIA_LIST.map(l => {
            const val       = info[l.id]
            const vazio     = val?.includes('vazio')
            const carregado = val && !vazio
            const cor = carregado ? '#007A45' : vazio ? '#D97706' : '#94A3B8'
            return (
              <div key={l.id} className={`${styles.detStat} ${vazio ? styles.detStatWarn : ''}`}>
                <div className={`${styles.detStatVal} ${styles.detStatValSm}`} style={{ color: cor }}>
                  <TrevoIcon loteria={l.id} size={16} /> {l.label}
                </div>
                <span className={`${styles.detStatLbl} ${styles.detStatLblPlain}`} style={{ color: cor }}>
                  {val ?? '—'}
                </span>
              </div>
            )
          })}
        </div>

        <div className={styles.btnRow}>
          <button className={`${styles.btnLoad} ${styles.btnLoadInline}`} onClick={verificar} disabled={verificando}>
            {verificando ? '⟳' : '🔍'} Verificar banco
          </button>
          {!rodando && (
            <button className={`${styles.btnLoad} ${styles.btnLoadInline}`} onClick={iniciar}>
              ⬇️ Carregar histórico — <TrevoIcon loteria={loteria} size={14} /> {cfg.label} (~{totais[loteria]} concursos)
            </button>
          )}
        </div>

        {!rodando && (
          <p className={styles.helpText} style={{ marginTop: 10 }}>
            Busca os concursos da <strong style={{ color: cfg.cor }}>{cfg.label}</strong> do seu browser e salva no banco.
            Aprox. <strong>{totais[loteria].toLocaleString('pt-BR')}</strong> concursos — leva ~15 min. <strong>Não feche esta aba.</strong>
          </p>
        )}

        {rodando && (
          <>
            <div className={styles.progressWrap}>
              <div className={styles.progressFill} style={{ width: `${pct}%`, background: cfg.cor }} />
            </div>
            <div className={styles.helpText}>{pct}% — {resumo}</div>
            <button className={styles.btnPerigoPad} onClick={() => { abortRef.current = true }}>
              ⏹ Parar
            </button>
          </>
        )}

        {!rodando && resumo && (
          <div className={`${styles.resumoMsg} ${resumo.includes('✅') ? styles.resumoMsgOk : styles.resumoMsgErr}`}>{resumo}</div>
        )}
      </div>

      {/* Seletor de loteria */}
      {!rodando && (
        <div className={styles.ferrSection}>
          <div className={styles.btnRow}>
            {LOTERIA_LIST.map(l => (
              <button key={l.id} type="button"
                className={`${styles.loteriaBotao} ${loteria === l.id ? styles.loteriaBotaoAtivo : ''}`}
                style={loteria === l.id ? { background: l.cor + '18', borderColor: l.cor, color: l.cor } : {}}
                onClick={() => { setLoteria(l.id); setResumo('') }}>
                <TrevoIcon loteria={l.id} size={14} /> {l.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Frequência / Top 15 / Atrasos lado a lado ── */}
      <div className={styles.ferrSection}>
        <div className={styles.ferrSectionHeader}>
          <span className={styles.ferrSectionLabel}>
            📊 Frequência
            {infoTotal ? <span className={styles.ferrSectionMeta}>— {infoTotal.toLocaleString('pt-BR')} concursos</span> : ''}
          </span>
        </div>

        {loadingEstat ? (
          <div className={styles.ferrLoading}>Carregando estatísticas da {cfg.label}...</div>
        ) : freqDados.length === 0 ? (
          <div className={styles.ferrLoading}>
            Histórico não carregado — clique em &quot;Carregar histórico&quot; abaixo.
          </div>
        ) : (
          <div className={styles.ferrCols3}>
            <div className={styles.ferrColuna}>
              <div className={styles.ferrRankTitle}>🔢 Todos os números</div>
              <div className={styles.ferrBallGrid} style={{ gridTemplateColumns: `repeat(${freqGridCols}, 1fr)` }}>
                {[...freqDados].sort((a, b) => a.numero - b.numero).map((d) => {
                  const rank = freqDados.findIndex(x => x.numero === d.numero)
                  return (
                    <div key={d.numero} className={styles.ferrBallItem}>
                      <div className={styles.ferrBall} style={{ background: corBola(rank, freqDados.length), borderColor: corBorda(rank, freqDados.length), color: corTexto(rank, freqDados.length) }}>
                        {String(d.numero).padStart(2, '0')}
                      </div>
                      <div className={styles.ferrBallCount}>{d.count}x</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className={styles.ferrColuna}>
              <div className={styles.ferrRankTitle}>🏆 Top 15</div>
              <div className={styles.ferrRanking}>
                {freqDados.slice(0, 15).map((d, i) => (
                  <div key={d.numero} className={styles.ferrRankRow}>
                    <span className={styles.ferrRankPos}>{i + 1}º</span>
                    <span className={styles.ferrRankBall} style={{ background: corBola(i, 15), borderColor: corBorda(i, 15), color: corTexto(i, 15) }}>
                      {String(d.numero).padStart(2, '0')}
                    </span>
                    <div className={styles.ferrRankBarWrap}>
                      <div className={styles.ferrRankBar} style={{ width: `${Math.round((d.count / maxFreq) * 100)}%`, background: corBola(i, 15) }} />
                    </div>
                    <span className={styles.ferrRankVal}>{d.count}x</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.ferrColuna}>
              <div className={styles.ferrRankTitle}>⏳ Atrasos</div>
              <div className={styles.ferrRanking}>
                {atrasosDados.slice(0, 15).map((d, i) => (
                  <div key={d.numero} className={styles.ferrRankRow}>
                    <span className={styles.ferrRankPos}>{i + 1}º</span>
                    <span className={styles.ferrRankBall} style={{ background: corBola(i, 15), borderColor: corBorda(i, 15), color: corTexto(i, 15) }}>
                      {String(d.numero).padStart(2, '0')}
                    </span>
                    <div className={styles.ferrRankBarWrap}>
                      <div className={styles.ferrRankBar} style={{ width: `${Math.round(((d.atraso || 0) / maxAtraso) * 100)}%`, background: corBola(i, 15) }} />
                    </div>
                    <span className={styles.ferrRankVal}>{d.atraso}c</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Combinações & Sequências ── */}
      <div className={styles.ferrSection}>
        <div className={styles.ferrSectionHeader}>
          <span className={styles.ferrSectionLabel}>🔢 Combinações & Sequências</span>
        </div>

        {loadingComb ? (
          <div className={styles.ferrLoading}>Carregando combinações da {cfg.label}...</div>
        ) : combDistrib.length === 0 ? (
          <div className={styles.ferrLoading}>Histórico não carregado.</div>
        ) : (
          <>
            <div className={styles.ferrRankTitle}>Sequências consecutivas por sorteio</div>
            <div className={styles.ferrRanking}>
              {combDistrib.map(d => {
                const label = d.tamanho === '1' ? 'Sem sequência' : d.tamanho === '5+' ? '5+ seguidos' : `${d.tamanho} seguidos`
                const maxCountSeq = Math.max(...combDistrib.map(x => x.count), 1)
                return (
                  <div key={d.tamanho} className={styles.ferrRankRow}>
                    <span className={styles.ferrRankPos} style={{ width: 110, textAlign: 'left' }}>{label}</span>
                    <div className={styles.ferrRankBarWrap}>
                      <div className={styles.ferrRankBar} style={{ width: `${Math.round((d.count / maxCountSeq) * 100)}%`, background: cfg.cor }} />
                    </div>
                    <span className={styles.ferrRankVal}>{d.pct}%</span>
                  </div>
                )
              })}
            </div>

            {combSoma && (
              <div className={styles.ferrStatsRow}>
                <div className={styles.ferrStatCard}>
                  <div className={styles.ferrStatVal}>{combSoma.media}</div>
                  <span className={styles.ferrStatLbl}>Soma média</span>
                </div>
                <div className={styles.ferrStatCard}>
                  <div className={styles.ferrStatVal}>{combSoma.min}</div>
                  <span className={styles.ferrStatLbl}>Menor soma</span>
                </div>
                <div className={styles.ferrStatCard}>
                  <div className={styles.ferrStatVal}>{combSoma.max}</div>
                  <span className={styles.ferrStatLbl}>Maior soma</span>
                </div>
              </div>
            )}

            <div className={styles.ferrCols4}>
              <div className={styles.ferrColuna}>
                <div className={styles.ferrRankTitle}>🔗 Duplas mais frequentes juntas</div>
                <div className={styles.ferrRanking}>
                  {combDuplas.map((d, i) => (
                    <div key={d.par.join('-')} className={styles.ferrRankRow}>
                      <span className={styles.ferrRankPos}>{i + 1}º</span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.cor, borderColor: cfg.cor, color: '#fff' }}>
                        {String(d.par[0]).padStart(2, '0')}
                      </span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.corSecundaria, borderColor: cfg.corSecundaria, color: '#fff' }}>
                        {String(d.par[1]).padStart(2, '0')}
                      </span>
                      <div className={styles.ferrRankBarWrap}>
                        <div className={styles.ferrRankBar} style={{ width: `${Math.round((d.count / (combDuplas[0]?.count || 1)) * 100)}%`, background: cfg.cor }} />
                      </div>
                      <span className={styles.ferrRankVal}>{d.count}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.ferrColuna}>
                <div className={styles.ferrRankTitle}>🔗 Trincas mais frequentes juntas</div>
                <div className={styles.ferrRanking}>
                  {combTrincas.map((d, i) => (
                    <div key={d.trio.join('-')} className={styles.ferrRankRow}>
                      <span className={styles.ferrRankPos}>{i + 1}º</span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.cor, borderColor: cfg.cor, color: '#fff' }}>
                        {String(d.trio[0]).padStart(2, '0')}
                      </span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.corSecundaria, borderColor: cfg.corSecundaria, color: '#fff' }}>
                        {String(d.trio[1]).padStart(2, '0')}
                      </span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.cor, borderColor: cfg.cor, color: '#fff' }}>
                        {String(d.trio[2]).padStart(2, '0')}
                      </span>
                      <div className={styles.ferrRankBarWrap}>
                        <div className={styles.ferrRankBar} style={{ width: `${Math.round((d.count / (combTrincas[0]?.count || 1)) * 100)}%`, background: cfg.cor }} />
                      </div>
                      <span className={styles.ferrRankVal}>{d.count}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.ferrColuna}>
                <div className={styles.ferrRankTitle}>🔢 Duplas consecutivas mais frequentes</div>
                <div className={styles.ferrRanking}>
                  {combDuplasConsec.map((d, i) => (
                    <div key={d.par.join('-')} className={styles.ferrRankRow}>
                      <span className={styles.ferrRankPos}>{i + 1}º</span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.cor, borderColor: cfg.cor, color: '#fff' }}>
                        {String(d.par[0]).padStart(2, '0')}
                      </span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.corSecundaria, borderColor: cfg.corSecundaria, color: '#fff' }}>
                        {String(d.par[1]).padStart(2, '0')}
                      </span>
                      <div className={styles.ferrRankBarWrap}>
                        <div className={styles.ferrRankBar} style={{ width: `${Math.round((d.count / (combDuplasConsec[0]?.count || 1)) * 100)}%`, background: cfg.cor }} />
                      </div>
                      <span className={styles.ferrRankVal}>{d.count}x</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.ferrColuna}>
                <div className={styles.ferrRankTitle}>🔢 Trincas consecutivas mais frequentes</div>
                <div className={styles.ferrRanking}>
                  {combTrincasConsec.map((d, i) => (
                    <div key={d.trio.join('-')} className={styles.ferrRankRow}>
                      <span className={styles.ferrRankPos}>{i + 1}º</span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.cor, borderColor: cfg.cor, color: '#fff' }}>
                        {String(d.trio[0]).padStart(2, '0')}
                      </span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.corSecundaria, borderColor: cfg.corSecundaria, color: '#fff' }}>
                        {String(d.trio[1]).padStart(2, '0')}
                      </span>
                      <span className={styles.ferrRankBall} style={{ background: cfg.cor, borderColor: cfg.cor, color: '#fff' }}>
                        {String(d.trio[2]).padStart(2, '0')}
                      </span>
                      <div className={styles.ferrRankBarWrap}>
                        <div className={styles.ferrRankBar} style={{ width: `${Math.round((d.count / (combTrincasConsec[0]?.count || 1)) * 100)}%`, background: cfg.cor }} />
                      </div>
                      <span className={styles.ferrRankVal}>{d.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
