'use client'
import { useEffect, useState, useCallback } from 'react'

interface Bolao { id: string; nome: string; slug: string; ativo: boolean; dezenas: number; num_apostas: number }
interface ConcursoAtivo { concurso: string; data: string; premio: string }

export default function Home() {
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState<ConcursoAtivo | null>(null)
  const [loading, setLoading]             = useState(true)
  const [host, setHost]                   = useState('')

  const carregar = useCallback((inicial = false) => {
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      fetch('/api/concurso-ativo').then(r => r.json()),
    ]).then(([b, c]) => {
      setBoloes(b.boloes || [])
      setConcursoAtivo(c)
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

  return (
    <div className="page-wrap">
      {/* Header */}
      <div className="site-header">
        <span className="logo">🍀</span>
        <div className="header-brand">
          <span className="brand">MEGA-SENA</span>
        </div>
        <a href="/admin" className="header-link">
          <span className="material-icons-round">settings</span>
        </a>
      </div>

      {/* Hero */}
      {concursoAtivo?.concurso && (
        <div className="mega-card">
          <div className="mega-header">
            <span className="mega-clover">🍀</span>
            <span className="mega-title">MEGA-SENA</span>
            <span className="mega-concurso">Concurso #{concursoAtivo.concurso}</span>
          </div>
          <div className="mega-body">
            {concursoAtivo.premio && concursoAtivo.premio !== 'Acumulando'
              ? <div className="mega-prize">{concursoAtivo.premio}</div>
              : <div className="mega-prize mega-prize-acc">Acumulando</div>
            }
            <div className="mega-prize-label">Prêmio estimado do concurso #{concursoAtivo.concurso}</div>
            {concursoAtivo.data && (
              <><div className="mega-draw-label">Sorteio</div>
              <div className="mega-draw-date">{concursoAtivo.data}</div></>
            )}
          </div>
        </div>
      )}

      {/* Bolões */}
      <div className="card">
        <div className="form-body">
          <div className="sec-title">🎰 Escolha seu Bolão</div>

          {loading && <div className="p-empty">Carregando...</div>}

          {!loading && boloes.length === 0 && (
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

          <div className="footer footer-index">
            <strong>Boa sorte a todos! 🍀</strong><br/>
            Dúvidas? Fale com o administrador do grupo.
          </div>
        </div>
      </div>
    </div>
  )
}
