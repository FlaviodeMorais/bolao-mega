'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import TrevoIcon from '@/components/TrevoIcon'
const LoteriasCards = dynamic(() => import('@/components/LoteriasCards'), { ssr: false })

interface Bolao { id: string; nome: string; slug: string; ativo: boolean; dezenas: number; num_apostas: number; loteria?: string }
interface BolaoEsporte { id: string; nome: string; slug: string; descricao?: string; valor_cota: number }
interface ConcursoAtivo { concurso: string; data: string; premio: string; ultimoConcurso?: string; ultimoDezenas?: number[] }
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
    <div className="mega-card" style={{ minWidth: 0, flex: '0 0 100%', scrollSnapAlign: 'start' }}>
      <div className="mega-header">
        <TrevoIcon size={26} loteria={s.id} />
        <span className="mega-title">{s.label.toUpperCase()}</span>
        <span className="mega-concurso">Concurso #{s.concurso}</span>
      </div>
      <div className="mega-body">
        {s.premio && s.premio !== 'Acumulando'
          ? <div className="mega-prize">{s.premio}</div>
          : <div className="mega-prize mega-prize-acc">Acumulando</div>
        }
        <div className="mega-prize-label">Prêmio estimado</div>
        {s.data && (
          <div className="mega-draw-row">
            <div>
              <div className="mega-draw-label">Sorteio</div>
              <div className="mega-draw-date">{s.data}</div>
            </div>
            {countdown && (
              <div className="mega-countdown-box">
                <div className="mega-draw-label">Faltam</div>
                <div className="mega-countdown-val">{countdown}</div>
              </div>
            )}
          </div>
        )}
        {s.dezenas.length > 0 && (
          <div className="ultimo-resultado">
            <div className="ultimo-resultado-label">Último resultado</div>
            <div className="ultimo-resultado-balls">
              {s.dezenas.map(n => (
                <span key={n} className="result-ball">{String(n).padStart(2, '0')}</span>
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
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.offsetWidth)
      setAtivo(idx)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (sorteios.length === 0) return null

  return (
    <div>
      <div ref={ref} style={{ display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', gap: 0 }}>
        {sorteios.map(s => <SorteioCard key={s.id} s={s} />)}
      </div>
      {sorteios.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, marginBottom: 4 }}>
          {sorteios.map((s, i) => (
            <button key={s.id} onClick={() => scrollTo(i)} style={{
              width: ativo === i ? 20 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
              background: ativo === i ? '#009B63' : '#CBD5E1', transition: 'all .25s', padding: 0,
            }} aria-label={s.label} />
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
    const id = setInterval(() => carregar(), 60000)
    const onFocus = () => carregar()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [carregar])

  // Carrega info dos sorteios de cada loteria em paralelo
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
        lista.push({
          id:      l.id,
          label:   l.label,
          concurso: (d.numero || 0) + 1,
          premio,
          data:    d.dataProximoConcurso || '',
          dezenas: d.dezenasSorteadas || [],
        })
      })
      setSorteios(lista)
    })
  }, [])

  const boloesAtivos = boloes.filter(b => b.ativo)

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="site-header">
        <TrevoIcon size={28} />
        <div className="header-brand"><span className="brand">MEGA-SENA</span></div>
        <a href="/admin" className="header-link">
          <span className="material-icons-round">settings</span>
        </a>
      </div>

      {/* Carrossel de Sorteios */}
      <CarrosselSorteios sorteios={sorteios} />

      {/* Fallback: card concurso ativo (enquanto carrossel carrega) */}
      {sorteios.length === 0 && concursoAtivo?.concurso && (
        <div className="mega-card">
          <div className="mega-header">
            <TrevoIcon size={26} />
            <span className="mega-title">MEGA-SENA</span>
            <span className="mega-concurso">Concurso #{concursoAtivo.concurso}</span>
          </div>
          <div className="mega-body">
            {concursoAtivo.premio && concursoAtivo.premio !== 'Acumulando'
              ? <div className="mega-prize">{concursoAtivo.premio}</div>
              : <div className="mega-prize mega-prize-acc">Acumulando</div>
            }
            <div className="mega-prize-label">Prêmio estimado</div>
          </div>
        </div>
      )}

      {/* Bolões */}
      <div className="card">
        <div className="form-body">
          <div className="sec-title">🎰 Escolha seu Bolão</div>

          {loading && <div className="p-empty">Carregando...</div>}

          {!loading && boloesAtivos.length === 0 && (
            <div className="p-empty">
              Nenhum bolão disponível no momento.<br/>
              Aguarde o administrador criar um.
            </div>
          )}

          {boloesAtivos.map(b => (
            <a key={b.id} href={`/${b.slug}`} className="bolao-link-card">
              <div className="blc-info">
                <div className="blc-nome">{b.nome}</div>
                {(b.num_apostas || b.dezenas) && (
                  <div className="blc-meta">{b.num_apostas || 1} Apostas | {b.dezenas || 6} dezenas</div>
                )}
                <div className="blc-slug">{host}/{b.slug}</div>
              </div>
              <span className="material-icons-round blc-arrow">arrow_forward_ios</span>
            </a>
          ))}

          <div className="home-links">
            <a href="/estatisticas" className="home-link-stat">📊 Análises &amp; Estatísticas da Mega-Sena</a>
          </div>

          <div className="footer footer-index">
            <strong>Boa sorte a todos! 🍀</strong><br/>
            Dúvidas? Fale com o administrador do grupo.
          </div>
        </div>
      </div>

      {/* Últimos resultados Caixa */}
      <LoteriasCards />

      {/* Bolões Esportivos */}
      {boloesEsporte.map(b => (
        <a key={b.id} href={`/esporte/${b.slug}`} className="esporte-card">
          <div className="esporte-card-header">
            <span className="esporte-card-icon">⚽</span>
            <span className="esporte-card-label">Bolão Esportivo</span>
          </div>
          <div className="esporte-card-body">
            <img src="/1684502982782.gif" alt="FIFA 2026" className="esporte-card-gif" />
            <div className="esporte-card-nome">{b.nome}</div>
            {b.descricao && <div className="esporte-card-desc">{b.descricao}</div>}
          </div>
        </a>
      ))}
    </div>
  )
}
