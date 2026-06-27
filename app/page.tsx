'use client'
import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import TrevoIcon from '@/components/TrevoIcon'
const LoteriasCards = dynamic(() => import('@/components/LoteriasCards'), { ssr: false })

interface Bolao { id: string; nome: string; slug: string; ativo: boolean; dezenas: number; num_apostas: number }
interface BolaoEsporte { id: string; nome: string; slug: string; descricao?: string; valor_cota: number }
interface ConcursoAtivo { concurso: string; data: string; premio: string; ultimoConcurso?: string; ultimoDezenas?: number[] }

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

export default function Home() {
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [boloesEsporte, setBoloesEsporte] = useState<BolaoEsporte[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState<ConcursoAtivo | null>(null)
  const [loading, setLoading]             = useState(true)
  const [host, setHost]                   = useState('')

  const countdown = useCountdown(concursoAtivo?.data || '')

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

  const dezenas = concursoAtivo?.ultimoDezenas || []

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

      {/* Hero */}
      {concursoAtivo?.concurso && (
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

            {concursoAtivo.data && (
              <div className="mega-draw-row">
                <div>
                  <div className="mega-draw-label">Sorteio</div>
                  <div className="mega-draw-date">{concursoAtivo.data}</div>
                </div>
                {countdown && (
                  <div className="mega-countdown-box">
                    <div className="mega-draw-label">Faltam</div>
                    <div className="mega-countdown-val">{countdown}</div>
                  </div>
                )}
              </div>
            )}

            {/* Último resultado */}
            {dezenas.length === 6 && (
              <div className="ultimo-resultado">
                <div className="ultimo-resultado-label">
                  Último resultado — Concurso #{concursoAtivo.ultimoConcurso}
                </div>
                <div className="ultimo-resultado-balls">
                  {dezenas.map(n => (
                    <span key={n} className="result-ball">{String(n).padStart(2, '0')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bolões */}
      <div className="card">
        <div className="form-body">
          <div className="sec-title">🎰 Escolha seu Bolão</div>

          {loading && <div className="p-empty">Carregando...</div>}

          {!loading && boloes.filter(b => b.ativo).length === 0 && (
            <div className="p-empty">
              Nenhum bolão disponível no momento.<br/>
              Aguarde o administrador criar um.
            </div>
          )}

          {boloes.filter(b => b.ativo).map(b => (
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
