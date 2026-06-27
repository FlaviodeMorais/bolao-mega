'use client'
import { useEffect, useState } from 'react'

interface NumStat { numero: number; count: number; pct: number; atraso?: number; ultimo_concurso?: number }

const ABAS = ['Frequência Geral', 'Recentes (100)', 'Atrasos'] as const
type Aba = typeof ABAS[number]

export default function EstatisticasPage() {
  const [aba, setAba]           = useState<Aba>('Frequência Geral')
  const [dados, setDados]       = useState<NumStat[]>([])
  const [info, setInfo]         = useState<{ total: number; primeiro: number; ultimo: number } | null>(null)
  const [loading, setLoading]   = useState(true)
  const [dbVazia, setDbVazia]   = useState(false)

  useEffect(() => {
    fetch('/api/estatisticas/info').then(r => r.json()).then(d => {
      setInfo(d)
      setDbVazia(!d.total || d.total < 10)
    })
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

  const maxCount = dados.length ? Math.max(...dados.map(d => d.count || d.atraso || 1)) : 1

  const corBola = (pos: number, total: number) => {
    const pct = 1 - pos / total
    if (pct > 0.66) return '#00A651'
    if (pct > 0.33) return '#1D6EA6'
    return 'rgba(255,255,255,.2)'
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
            <div className="bolao-nao-config">
              ⚠️ Histórico ainda não carregado. Acesse o painel admin → Ferramentas → Ingerir Histórico para carregar os dados da Caixa.
            </div>
          </div>
        </div>
      )}

      {!dbVazia && (
        <>
          {/* Abas */}
          <div className="estat-tabs">
            {ABAS.map(a => (
              <button key={a} className={`estat-tab${aba === a ? ' ativo' : ''}`} onClick={() => setAba(a)}>{a}</button>
            ))}
          </div>

          {loading && <div className="p-empty">Carregando análise...</div>}

          {!loading && dados.length > 0 && (
            <>
              {/* Grade de bolinhas — frequência */}
              {aba !== 'Atrasos' && (
                <div className="estat-balls-wrap">
                  <div className="estat-section-title">Frequência por número</div>
                  <div className="estat-balls-grid">
                    {[...dados].sort((a, b) => a.numero - b.numero).map((d, i) => {
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

              {/* Ranking */}
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
                        {aba === 'Atrasos'
                          ? `${d.atraso} conc.`
                          : `${d.count}x (${d.pct}%)`
                        }
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
