'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import TrevoIcon from '@/components/TrevoIcon'
import styles from './home.module.css'
const LoteriasCards = dynamic(() => import('@/components/LoteriasCards'), { ssr: false })

interface Bolao { id: string; nome: string; slug: string; ativo: boolean; dezenas: number; num_apostas: number; loteria?: string }
interface BolaoEsporte { id: string; nome: string; slug: string; descricao?: string; valor_cota: number }
interface ConcursoAtivo { concurso: string; data: string; premio: string }
interface SorteioInfo { id: string; label: string; concurso: number; premio: string; data: string; dezenas: number[] }

const LOTERIAS_HOME = [
  { id: 'mega',      label: 'Mega-Sena',  apiSlug: 'megasena'  },
  { id: 'quina',     label: 'Quina',      apiSlug: 'quina'     },
  { id: 'lotofacil', label: 'Lotofácil',  apiSlug: 'lotofacil' },
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

function SorteioCard({ s }: { s: SorteioInfo }) {
  const countdown = useCountdown(s.data)
  return (
    <div className={styles.sorteioCard}>
      <div className={styles.sorteioCardHead}>
        <TrevoIcon size={22} loteria={s.id} />
        <span className={styles.sorteioCardTitle}>{s.label}</span>
        <span className={styles.sorteioBadge}>#{s.concurso}</span>
      </div>
      <div className={styles.sorteioCardBody}>
        <div className={`${styles.sorteioPremio}${s.premio === 'Acumulando' ? ' ' + styles.sorteioPremioAcc : ''}`}>
          {s.premio}
        </div>
        <div className={styles.sorteioLabel}>Prêmio estimado próximo concurso</div>

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

        {s.dezenas.length > 0 && (
          <div className={styles.sorteioUltimo}>
            <div className={styles.sorteioUltimoLabel}>Último resultado</div>
            <div className={styles.sorteioBalls}>
              {s.dezenas.map(n => (
                <span key={n} className={styles.sorteioBall}>{String(n).padStart(2, '0')}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function CarrosselSorteios({ sorteios }: { sorteios: SorteioInfo[] }) {
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

  return (
    <div className={styles.sorteioWrap}>
      <div ref={ref} className={styles.sorteioTrack}>
        {sorteios.map(s => <SorteioCard key={s.id} s={s} />)}
      </div>
      {sorteios.length > 1 && (
        <div className={styles.sorteioDots}>
          {sorteios.map((s, i) => (
            <button key={s.id} onClick={() => scrollTo(i)} className={styles.sorteioDot}
              style={{
                width: ativo === i ? 20 : 6,
                background: ativo === i ? '#00AB67' : 'rgba(255,255,255,0.15)',
              }}
              aria-label={s.label}
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
  const [concursoAtivo, setConcursoAtivo] = useState<ConcursoAtivo | null>(null)
  const [loading, setLoading]             = useState(true)
  const [host, setHost]                   = useState('')
  const [sorteios, setSorteios]           = useState<SorteioInfo[]>([])
  const [grupoNome, setGrupoNome]         = useState('BOLÃO 💯')

  const carregar = useCallback((inicial = false) => {
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      fetch('/api/concurso-ativo').then(r => r.json()),
      fetch('/api/esporte/boloes').then(r => r.json()).catch(() => ({ boloes: [] })),
    ]).then(([b, c, e]) => {
      setBoloes(b.boloes || [])
      setConcursoAtivo(c)
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
        if (!d || !d.numero) return
        const val = d.valorEstimadoProximoConcurso
        const premio = val
          ? `R$ ${(val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi`
          : 'Acumulando'
        lista.push({ id: l.id, label: l.label, concurso: (d.numero || 0) + 1, premio, data: d.dataProximoConcurso || '', dezenas: d.dezenasSorteadas || [] })
      })
      setSorteios(lista)
    })
  }, [])

  const boloesAtivos = boloes.filter(b => b.ativo)

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

      {/* ── Carrossel de Sorteios ── */}
      <CarrosselSorteios sorteios={sorteios} />

      {/* Fallback enquanto carrossel carrega */}
      {sorteios.length === 0 && concursoAtivo?.concurso && (
        <div className={styles.sorteioWrap}>
          <div className={styles.sorteioCard}>
            <div className={styles.sorteioCardHead}>
              <TrevoIcon size={22} loteria="mega" />
              <span className={styles.sorteioCardTitle}>Mega-Sena</span>
              <span className={styles.sorteioBadge}>#{concursoAtivo.concurso}</span>
            </div>
            <div className={styles.sorteioCardBody}>
              <div className={styles.sorteioPremio}>{concursoAtivo.premio || 'Acumulando'}</div>
              <div className={styles.sorteioLabel}>Prêmio estimado próximo concurso</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bolões de Loteria ── */}
      <div className={styles.secWrap}>
        <div className={styles.secCard}>
          <div className={styles.secHead}>
            <span className={styles.secTitle}>🎰 Escolha seu Bolão</span>
          </div>
          <div className={styles.secBody}>

            {loading && <div className={styles.empty}>Carregando...</div>}

            {!loading && boloesAtivos.length === 0 && (
              <div className={styles.empty}>
                Nenhum bolão disponível no momento.<br />
                Aguarde o administrador criar um.
              </div>
            )}

            {boloesAtivos.map(b => (
              <a key={b.id} href={`/${b.slug}`} className={styles.bolaoCard}>
                <TrevoIcon size={28} loteria={b.loteria ?? 'mega'} />
                <div className={styles.bolaoInfo}>
                  <div className={styles.bolaoNome}>{b.nome}</div>
                  {(b.num_apostas || b.dezenas) && (
                    <div className={styles.bolaoMeta}>{b.num_apostas || 1} Apostas · {b.dezenas || 6} dezenas</div>
                  )}
                  <div className={styles.bolaoSlug}>{host}/{b.slug}</div>
                </div>
                <span className={`material-icons-round ${styles.bolaoArrow}`}>arrow_forward_ios</span>
              </a>
            ))}

            <a href="/estatisticas" className={styles.statLink}>
              📊 Análises &amp; Estatísticas da Mega-Sena
            </a>

          </div>
          <div className={styles.footer}>
            <strong>Boa sorte a todos! 🍀</strong><br />
            Dúvidas? Fale com o administrador do grupo.
          </div>
        </div>
      </div>

      {/* ── Bolões Esportivos ── */}
      {boloesEsporte.map(b => (
        <div key={b.id} className={styles.secWrap}>
          <a href={`/esporte/${b.slug}`} className={styles.esporteCard}>
            <div className={styles.esporteCardHead}>
              <span style={{ fontSize: 20 }}>⚽</span>
              <span className={styles.esporteCardLabel}>Bolão Esportivo</span>
            </div>
            <div className={styles.esporteCardBody}>
              <img src="/1684502982782.gif" alt="FIFA 2026" className={styles.esporteCardGif} />
              <div className={styles.esporteCardNome}>{b.nome}</div>
              {b.descricao && <div className={styles.esporteCardDesc}>{b.descricao}</div>}
            </div>
          </a>
        </div>
      ))}

      {/* ── Últimos Resultados Caixa ── */}
      <div className={styles.loteriasWrap}>
        <LoteriasCards />
      </div>

    </div>
  )
}
