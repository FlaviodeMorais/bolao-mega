'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import TrevoIcon from '@/components/TrevoIcon'
import styles from './home.module.css'
const LoteriasCards = dynamic(() => import('@/components/LoteriasCards'), { ssr: false })

interface Bolao { id: string; nome: string; slug: string; ativo: boolean; dezenas: number; num_apostas: number; loteria?: string }
interface BolaoEsporte { id: string; nome: string; slug: string; descricao?: string; valor_cota: number }

interface SorteioInfo {
  id: string
  label: string
  apiSlug: string
  concurso: number
  premio: string
  data: string
  dezenas: number[]
  corA: string
  corGlow: string
}

const LOTERIAS_HOME: Omit<SorteioInfo, 'concurso' | 'premio' | 'data' | 'dezenas'>[] = [
  { id: 'mega',      label: 'Mega-Sena',  apiSlug: 'megasena',  corA: '#00AB67', corGlow: 'rgba(0,171,103,0.18)' },
  { id: 'quina',     label: 'Quina',      apiSlug: 'quina',     corA: '#005DA4', corGlow: 'rgba(0,93,164,0.18)'  },
  { id: 'lotofacil', label: 'Lotofácil',  apiSlug: 'lotofacil', corA: '#803594', corGlow: 'rgba(128,53,148,0.18)'},
]

function useCountdown(dataStr: string) {
  const [texto, setTexto] = useState('')
  useEffect(() => {
    if (!dataStr) return
    const m = dataStr.match(/(\d{1,2})\/(\d{2})/)
    if (!m) return
    const hm = dataStr.match(/(\d{1,2})h(\d{2})?/)
    const hora = hm ? parseInt(hm[1]) : 20
    const min  = hm?.[2] ? parseInt(hm[2]) : 0
    const draw = new Date(new Date().getFullYear(), parseInt(m[2]) - 1, parseInt(m[1]), hora, min, 0)
    const tick = () => {
      const diff = draw.getTime() - Date.now()
      if (diff <= 0) { setTexto('Encerrado'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const mn = Math.floor((diff % 3600000) / 60000)
      setTexto(d > 0 ? `${d}d ${h}h ${mn}min` : `${h}h ${mn}min`)
    }
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id)
  }, [dataStr])
  return texto
}

function SorteioCard({ s, boloes, host }: { s: SorteioInfo; boloes: Bolao[]; host: string }) {
  const countdown = useCountdown(s.data)
  const boloesLoteria = boloes.filter(b => b.ativo && (b.loteria ?? 'mega') === s.id)

  return (
    <div className={styles.sorteioCard}>
      {/* Header */}
      <div className={styles.sorteioCardHead} style={{ borderBottom: `1px solid ${s.corA}20` }}>
        <TrevoIcon size={22} loteria={s.id} />
        <span className={styles.sorteioCardTitle}>{s.label}</span>
        {s.concurso > 0 && (
          <span className={styles.sorteioBadge}>#{s.concurso}</span>
        )}
      </div>

      <div className={styles.sorteioCardBody}>
        {/* Prêmio */}
        <div className={styles.sorteioPremio} style={{ color: s.corA }}>
          {s.premio}
        </div>
        <div className={styles.sorteioLabel}>Prêmio estimado · próximo concurso</div>

        {/* Data + Countdown */}
        {s.data && (
          <div className={styles.sorteioRow}>
            <div className={styles.sorteioInfo}>
              <div className={styles.sorteioInfoLabel}>Sorteio</div>
              <div className={styles.sorteioInfoVal}>{s.data}</div>
            </div>
            {countdown && (
              <div className={styles.sorteioCountdown}>
                <div className={styles.sorteioInfoLabel}>Faltam</div>
                <div className={styles.sorteioCountdownVal}>{countdown}</div>
              </div>
            )}
          </div>
        )}

        {/* Bolões desta loteria */}
        {boloesLoteria.length > 0 && (
          <div className={styles.cardBoloes}>
            <div className={styles.cardBoloesTitulo} style={{ color: s.corA }}>
              🎰 Bolões disponíveis
            </div>
            {boloesLoteria.map(b => (
              <a key={b.id} href={`/${b.slug}`} className={styles.cardBolaoItem}
                style={{ borderColor: `${s.corA}25` }}>
                <div className={styles.cardBolaoInfo}>
                  <span className={styles.cardBolaoNome}>{b.nome}</span>
                  <span className={styles.cardBolaoMeta}>{b.num_apostas || 1} apostas · {b.dezenas || 6} dezenas</span>
                </div>
                <span className={`material-icons-round ${styles.cardBolaoArrow}`}
                  style={{ color: s.corA }}>arrow_forward_ios</span>
              </a>
            ))}
          </div>
        )}

        {/* Último resultado */}
        {s.dezenas.length > 0 && (
          <div className={styles.sorteioUltimo}>
            <div className={styles.sorteioUltimoLabel}>Último resultado</div>
            <div className={styles.sorteioBalls}>
              {s.dezenas.map(n => (
                <span key={n} className={styles.sorteioBall}
                  style={{ background: `${s.corA}18`, borderColor: `${s.corA}50`, color: s.corA }}>
                  {String(n).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EsporteCardCarrossel({ boloesEsporte }: { boloesEsporte: BolaoEsporte[] }) {
  return (
    <div className={`${styles.sorteioCard} ${styles.esporteCarrosselCard}`}>
      <div className={styles.sorteioCardHead} style={{ borderBottom: '1px solid rgba(29,110,166,0.25)' }}>
        <span style={{ fontSize: 20 }}>⚽</span>
        <span className={styles.sorteioCardTitle}>Bolão Esportivo</span>
        <span className={styles.sorteioBadge} style={{ background: 'rgba(29,110,166,0.2)', borderColor: 'rgba(29,110,166,0.35)', color: '#60b4f0' }}>
          FIFA 2026
        </span>
      </div>
      <div className={styles.sorteioCardBody}>
        <img src="/1684502982782.gif" alt="FIFA 2026" className={styles.esporteCarrosselGif} />
        {boloesEsporte.length > 0 ? (
          <div className={styles.cardBoloes} style={{ marginTop: 16 }}>
            <div className={styles.cardBoloesTitulo} style={{ color: '#60b4f0' }}>
              ⚽ Bolões disponíveis
            </div>
            {boloesEsporte.map(b => (
              <a key={b.id} href={`/esporte/${b.slug}`} className={styles.cardBolaoItem}
                style={{ borderColor: 'rgba(29,110,166,0.25)' }}>
                <div className={styles.cardBolaoInfo}>
                  <span className={styles.cardBolaoNome}>{b.nome}</span>
                  {b.descricao && <span className={styles.cardBolaoMeta}>{b.descricao}</span>}
                </div>
                <span className={`material-icons-round ${styles.cardBolaoArrow}`}
                  style={{ color: '#60b4f0' }}>arrow_forward_ios</span>
              </a>
            ))}
          </div>
        ) : (
          <div className={styles.empty} style={{ marginTop: 16 }}>
            Nenhum bolão esportivo ativo no momento.
          </div>
        )}
      </div>
    </div>
  )
}

function CarrosselSorteios({ sorteios, boloes, boloesEsporte, host }: { sorteios: SorteioInfo[]; boloes: Bolao[]; boloesEsporte: BolaoEsporte[]; host: string }) {
  const totalSlides = sorteios.length + 1 // +1 para esporte
  const [ativo, setAtivo] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  function scrollTo(i: number) {
    setAtivo(i)
    ref.current?.children[i]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => setAtivo(Math.round(el.scrollLeft / el.offsetWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (sorteios.length === 0) return null

  const dots = [
    ...sorteios.map(s => ({ key: s.id, label: s.label, cor: s.corA })),
    { key: 'esporte', label: 'Esportivo', cor: '#1D6EA6' },
  ]

  return (
    <div className={styles.sorteioWrap}>
      <div ref={ref} className={styles.sorteioTrack}>
        {sorteios.map(s => <SorteioCard key={s.id} s={s} boloes={boloes} host={host} />)}
        <EsporteCardCarrossel boloesEsporte={boloesEsporte} />
      </div>
      {totalSlides > 1 && (
        <div className={styles.sorteioDots}>
          {dots.map((d, i) => (
            <button key={d.key} onClick={() => scrollTo(i)} className={styles.sorteioDot}
              style={{
                width: ativo === i ? 20 : 6,
                background: ativo === i ? d.cor : 'rgba(255,255,255,0.15)',
              }}
              aria-label={d.label}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [boloesEsporte, setBoloesEsporte] = useState<BolaoEsporte[]>([])
  const [loading, setLoading]             = useState(true)
  const [host, setHost]                   = useState('')
  const [sorteios, setSorteios]           = useState<SorteioInfo[]>([])
  const [grupoNome, setGrupoNome]         = useState('BOLÃO 💯')

  const carregar = useCallback((inicial = false) => {
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      fetch('/api/esporte/boloes').then(r => r.json()).catch(() => ({ boloes: [] })),
    ]).then(([b, e]) => {
      setBoloes(b.boloes || [])
      setBoloesEsporte(e.boloes || [])
      if (inicial) setLoading(false)
    }).catch(() => { if (inicial) setLoading(false) })
  }, [])

  useEffect(() => {
    setHost(window.location.host)
    carregar(true)
    fetch('/api/config-publica').then(r => r.json()).then(d => {
      if (d?.app?.grupo_nome) setGrupoNome(d.app.grupo_nome)
    }).catch(() => {})
    const id = setInterval(() => carregar(), 60000)
    const onFocus = () => carregar()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [carregar])

  useEffect(() => {
    Promise.all(
      LOTERIAS_HOME.map(l =>
        fetch(`/api/resultados/${l.apiSlug}`).then(r => r.json()).catch(() => null)
      )
    ).then(results => {
      const lista: SorteioInfo[] = []
      LOTERIAS_HOME.forEach((l, i) => {
        const d = results[i]
        const val = d?.valorEstimadoProximoConcurso
        const premio = val
          ? `R$ ${(val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi`
          : 'Acumulando'
        lista.push({
          ...l,
          concurso: d?.numero ? (d.numero + 1) : 0,
          premio,
          data: d?.dataProximoConcurso || '',
          dezenas: (d?.listaDezenas || []).map(Number),
        })
      })
      setSorteios(lista)
    })
  }, [])

  // Bolões sem loteria específica ou que não estão no carrossel
  const boloesAtivos = boloes.filter(b => b.ativo)
  // Loterias com bolões (para exibir no carrossel)
  const loteriasNoCarrossel = new Set(LOTERIAS_HOME.map(l => l.id))
  // Bolões de loterias fora do carrossel (edge case)
  const boloesForaDoCarrossel = boloesAtivos.filter(b => !loteriasNoCarrossel.has(b.loteria ?? 'mega'))

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <TrevoIcon size={26} />
        <div className={styles.headerBrand}>
          {grupoNome}
          <span className={styles.headerSub}>Bolões de Loteria & Esportes</span>
        </div>
        <a href="/admin" className={styles.headerBtn} aria-label="Admin">
          <span className="material-icons-round" style={{ fontSize: 18 }}>settings</span>
        </a>
      </div>

      {/* ── Carrossel: um card por loteria com seus bolões e resultados ── */}
      {loading
        ? <div className={styles.sorteioWrap}><div className={styles.empty}>Carregando...</div></div>
        : <CarrosselSorteios sorteios={sorteios} boloes={boloes} boloesEsporte={boloesEsporte} host={host} />
      }

      {/* Bolões de loterias fora do carrossel (raro) */}
      {boloesForaDoCarrossel.length > 0 && (
        <div className={styles.secWrap}>
          <div className={styles.secCard}>
            <div className={styles.secHead}>
              <span className={styles.secTitle}>🎰 Outros Bolões</span>
            </div>
            <div className={styles.secBody}>
              {boloesForaDoCarrossel.map(b => (
                <a key={b.id} href={`/${b.slug}`} className={styles.bolaoCard}>
                  <TrevoIcon size={28} loteria={b.loteria ?? 'mega'} />
                  <div className={styles.bolaoInfo}>
                    <div className={styles.bolaoNome}>{b.nome}</div>
                    <div className={styles.bolaoMeta}>{b.num_apostas || 1} Apostas · {b.dezenas || 6} dezenas</div>
                    <div className={styles.bolaoSlug}>{host}/{b.slug}</div>
                  </div>
                  <span className={`material-icons-round ${styles.bolaoArrow}`}>arrow_forward_ios</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className={styles.secWrap}>
        <a href="/estatisticas" className={styles.statLink}>
          📊 Análises &amp; Estatísticas da Mega-Sena
        </a>
      </div>

      {/* ── Últimos Resultados Caixa ── */}
      <div className={styles.loteriasWrap}>
        <LoteriasCards />
      </div>

    </div>
  )
}
