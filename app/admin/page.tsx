'use client'
import { useState, useEffect, useCallback } from 'react'
import styles from './admin.module.css'

interface Participante { id: string; nome: string; cotas: string[]; total: number; status: string; created_at: string }
interface Concurso { num: number; data: string; premio: string }

export default function AdminPage() {
  const [logado, setLogado]               = useState(false)
  const [senha, setSenha]                 = useState('')
  const [errLogin, setErrLogin]           = useState('')
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState('')
  const [dataAtiva, setDataAtiva]         = useState('')
  const [premioAtivo, setPremioAtivo]     = useState('')
  const [proximos, setProximos]           = useState<Concurso[]>([])
  const [loadingCaixa, setLoadingCaixa]   = useState(false)

  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })
    if (res.ok) { setLogado(true); setErrLogin('') }
    else setErrLogin('Senha incorreta.')
  }

  const carregarDados = useCallback(async () => {
    const [ca, part] = await Promise.all([
      fetch('/api/concurso-ativo').then(r => r.json()),
      concursoAtivo
        ? fetch(`/api/participantes?concurso=${concursoAtivo}`).then(r => r.json())
        : Promise.resolve({ participantes: [] }),
    ])
    setConcursoAtivo(ca.concurso || '')
    setDataAtiva(ca.data || '')
    setPremioAtivo(ca.premio || '')
    setParticipantes(part.participantes || [])
  }, [concursoAtivo])

  useEffect(() => { if (logado) carregarDados() }, [logado, carregarDados])

  async function buscarCaixa() {
    setLoadingCaixa(true)
    try {
      const API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'
      let data: Record<string, unknown>
      try { data = await fetch(API).then(r => r.json()) }
      catch {
        const w = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(API)}`).then(r => r.json())
        data = JSON.parse(w.contents as string)
      }
      const ultimo = parseInt(String(data.numero || data.numeroConcurso || 0))
      const proxData = String(data.dataProximoConcurso || '')
      const premioVal = data.valorEstimadoProximoConcurso as number

      const d1 = parseBRDate(proxData)
      const d2 = d1 ? nextDrawDate(d1) : null
      const d3 = d2 ? nextDrawDate(d2) : null

      setProximos([
        { num: ultimo+1, data: formatData(d1), premio: premioVal ? formatPremio(premioVal) : '—' },
        { num: ultimo+2, data: formatData(d2), premio: 'Acumulando' },
        { num: ultimo+3, data: formatData(d3), premio: 'Acumulando' },
      ])
    } finally { setLoadingCaixa(false) }
  }

  async function selecionarConcurso(c: Concurso) {
    await fetch('/api/concurso-ativo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurso: c.num, data: c.data, premio: c.premio }),
    })
    setConcursoAtivo(String(c.num))
    setDataAtiva(c.data)
    setPremioAtivo(c.premio)
    setParticipantes([])
  }

  async function confirmarPagamento(id: string) {
    await fetch(`/api/participantes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pago' }),
    })
    carregarDados()
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir ${nome}?`)) return
    await fetch(`/api/participantes/${id}`, { method: 'DELETE' })
    carregarDados()
  }

  const totalArrecadado = participantes.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.total), 0)
  const cotasLivres = 20 - [...new Set(participantes.flatMap(p => p.cotas))].length

  if (!logado) return (
    <div className={styles.loginWrap}>
      <div className={styles.loginBox}>
        <div className={styles.loginTitle}>🔒 ÁREA DO ADMIN</div>
        <div className={styles.loginSub}>GRUPO MEGA 💯</div>
        <input type="password" placeholder="SENHA ADMIN" value={senha} onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()} className={styles.loginInput} />
        {errLogin && <div className={styles.loginErr}>{errLogin}</div>}
        <button className={styles.loginBtn} onClick={login}>ENTRAR</button>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>⚙️ PAINEL ADMIN — GRUPO MEGA 💯</h1>
        <a href="/" className={styles.linkForm}>← Ver formulário</a>
      </div>

      {/* STATS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Concurso Ativo</div>
          <div className={styles.statVal}>{concursoAtivo ? `#${concursoAtivo}` : '—'}</div>
          {dataAtiva && <div className={styles.statSub}>{dataAtiva}</div>}
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Cotas Livres</div>
          <div className={styles.statVal}>{cotasLivres}/20</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Arrecadado</div>
          <div className={styles.statVal}>R$ {totalArrecadado.toFixed(2).replace('.', ',')}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Prêmio Estimado</div>
          <div className={styles.statVal}>{premioAtivo || '—'}</div>
        </div>
      </div>

      <div className={styles.grid2}>
        {/* SELETOR DE CONCURSOS */}
        <div className={styles.panel}>
          <div className={styles.panelTitle}>🎲 PRÓXIMOS CONCURSOS</div>
          <button className={styles.btnLoad} onClick={buscarCaixa} disabled={loadingCaixa}>
            {loadingCaixa ? 'Carregando...' : '🔄 Buscar na Caixa'}
          </button>
          {proximos.map(c => (
            <div key={c.num} className={`${styles.concursoCard} ${String(c.num) === concursoAtivo ? styles.ativo : ''}`}>
              <div>
                <div className={styles.ccNum}>#{c.num}</div>
                <div className={styles.ccData}>{c.data}</div>
                <div className={styles.ccPremio}>{c.premio}</div>
              </div>
              <button
                className={`${styles.btnSel} ${String(c.num) === concursoAtivo ? styles.btnSelAtivo : ''}`}
                onClick={() => selecionarConcurso(c)}
              >
                {String(c.num) === concursoAtivo ? '✔ ATIVO' : 'SELECIONAR'}
              </button>
            </div>
          ))}
        </div>

        {/* PARTICIPANTES */}
        <div className={styles.panel}>
          <div className={styles.panelTitle}>👥 PARTICIPANTES — #{concursoAtivo || '?'}</div>
          <button className={styles.btnLoad} onClick={carregarDados}>🔄 Atualizar</button>
          {participantes.length === 0
            ? <div className={styles.empty}>Nenhum participante registrado</div>
            : participantes.map(p => (
              <div key={p.id} className={styles.partRow}>
                <div className={styles.partInfo}>
                  <div className={styles.partNome}>{p.nome}</div>
                  <div className={styles.partCotas}>{Array.isArray(p.cotas) ? p.cotas.join(', ') : p.cotas}</div>
                  <div className={styles.partTotal}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</div>
                </div>
                <div className={styles.partActions}>
                  {p.status === 'pago'
                    ? <span className={styles.statusPago}>✅ PAGO</span>
                    : <>
                        <span className={styles.statusPend}>⏳ PENDENTE</span>
                        <button className={styles.btnConfirm} onClick={() => confirmarPagamento(p.id)}>✔ PAGO</button>
                      </>
                  }
                  <button className={styles.btnExcluir} onClick={() => excluir(p.id, p.nome)}>✖</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  )
}

function parseBRDate(str: string): Date | null {
  if (!str) return null
  const [d, m, y] = str.split('/').map(Number)
  return new Date(y, m - 1, d)
}
function nextDrawDate(d: Date): Date {
  const dia = d.getDay()
  const add = dia === 2 ? 2 : dia === 4 ? 2 : dia === 6 ? 3 : 1
  const n = new Date(d); n.setDate(n.getDate() + add); return n
}
function formatData(d: Date | null): string {
  if (!d) return '—'
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} · ${dias[d.getDay()]}`
}
function formatPremio(v: number): string {
  if (v >= 1e9) return `R$ ${(v/1e9).toFixed(1).replace('.',',')} bi`
  if (v >= 1e6) return `R$ ${(v/1e6).toFixed(1).replace('.',',')} mi`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
