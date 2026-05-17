'use client'
import { useState, useEffect, useCallback } from 'react'
import styles from './admin.module.css'

interface Participante { id: string; nome: string; cotas: string[]; total: number; status: string }
interface Concurso    { num: number; data: string; premio: string }
interface Bolao       { id: string; nome: string; slug: string; valor_cota: number; total_cotas: number; ativo: boolean }
interface HistoricoItem { concurso: number; bolao_slug: string | null; total: number; arrecadado: number; pagos: number; cancelados: number }

export default function AdminPage() {
  const [logado, setLogado]               = useState(false)
  const [senha, setSenha]                 = useState('')
  const [errLogin, setErrLogin]           = useState('')

  // Dados
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [bolaoAtual, setBolaoAtual]       = useState<Bolao | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState('')
  const [dataAtiva, setDataAtiva]         = useState('')
  const [premioAtivo, setPremioAtivo]     = useState('')
  const [proximos, setProximos]           = useState<Concurso[]>([])
  const [loadingCaixa, setLoadingCaixa]   = useState(false)
  const [historico, setHistorico]         = useState<HistoricoItem[]>([])
  const [showHistorico, setShowHistorico] = useState(false)

  // Senha
  const [showSenha, setShowSenha]       = useState(false)
  const [senhaAtual, setSenhaAtual]     = useState('')
  const [novaSenha, setNovaSenha]       = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [senhaMsg, setSenhaMsg]         = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  // Criar bolão
  const [showCreate, setShowCreate]       = useState(false)
  const [novoNome, setNovoNome]           = useState('')
  const [novoSlug, setNovoSlug]           = useState('')
  const [criando, setCriando]             = useState(false)
  const [linkCopiado, setLinkCopiado]     = useState(false)

  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })
    if (res.ok) { setLogado(true); setErrLogin(''); carregarBoloes() }
    else setErrLogin('Senha incorreta.')
  }

  async function alterarSenha() {
    if (novaSenha !== confirmSenha) { setSenhaMsg('❌ As senhas não coincidem.'); return }
    if (novaSenha.length < 6)       { setSenhaMsg('❌ Mínimo de 6 caracteres.'); return }
    setSalvandoSenha(true); setSenhaMsg('')
    const res = await fetch('/api/admin/senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    }).then(r => r.json())
    setSalvandoSenha(false)
    if (res.ok) {
      setSenhaMsg('✅ Senha alterada com sucesso!')
      setSenhaAtual(''); setNovaSenha(''); setConfirmSenha('')
      setTimeout(() => { setSenhaMsg(''); setShowSenha(false) }, 3000)
    } else {
      setSenhaMsg('❌ ' + res.error)
    }
  }

  async function carregarHistorico() {
    const res = await fetch('/api/historico').then(r => r.json())
    setHistorico(res.historico || [])
    setShowHistorico(true)
  }

  async function carregarBoloes() {
    const res = await fetch('/api/boloes').then(r => r.json())
    setBoloes(res.boloes || [])
  }

  const carregarDados = useCallback(async () => {
    const ca = await fetch('/api/concurso-ativo').then(r => r.json())
    const concurso = ca.concurso || ''
    setConcursoAtivo(concurso)
    setDataAtiva(ca.data || '')
    setPremioAtivo(ca.premio || '')
    if (concurso) {
      const part = await fetch(`/api/participantes?concurso=${concurso}`).then(r => r.json())
      setParticipantes(part.participantes || [])
    }
  }, [])

  useEffect(() => { if (logado) carregarDados() }, [logado, carregarDados])

  async function criarBolao() {
    if (!novoNome || !novoSlug) return
    setCriando(true)
    await fetch('/api/boloes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, slug: novoSlug }),
    })
    await carregarBoloes()
    setNovoNome(''); setNovoSlug(''); setShowCreate(false); setCriando(false)
  }

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
      const ultimo  = parseInt(String(data.numero || data.numeroConcurso || 0))
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
    setConcursoAtivo(String(c.num)); setDataAtiva(c.data); setPremioAtivo(c.premio)
    const part = await fetch(`/api/participantes?concurso=${c.num}`).then(r => r.json())
    setParticipantes(part.participantes || [])
  }

  async function confirmarPagamento(id: string) {
    await fetch(`/api/participantes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'pago' }) })
    carregarDados()
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir ${nome}?`)) return
    await fetch(`/api/participantes/${id}`, { method: 'DELETE' })
    carregarDados()
  }

  function copiarLink(slug: string) {
    const url = `${window.location.origin}/${slug}`
    navigator.clipboard.writeText(url).then(() => { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000) })
  }

  const totalArrecadado = participantes.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.total), 0)
  const totalCotas      = [...new Set(participantes.flatMap(p => Array.isArray(p.cotas) ? p.cotas : []))].length
  const cotasLivres     = 20 - totalCotas

  if (!logado) return (
    <div className={styles.loginWrap}>
      <div className={styles.loginBox}>
        <div className={styles.loginTitle}>🍀 Admin</div>
        <div className={styles.loginSub}>GRUPO MEGA 💯</div>
        <input type="password" placeholder="SENHA ADMIN" value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          className={styles.loginInput} />
        {errLogin && <div className={styles.loginErr}>{errLogin}</div>}
        <button type="button" className={styles.loginBtn} onClick={login}>Entrar</button>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>⚙️ Painel Admin — Grupo Mega 💯</h1>
        <a href="/" className={styles.linkForm}>← Formulário</a>
      </div>

      <div className={styles.content}>
        {/* Stats */}
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
          {/* LEFT COLUMN */}
          <div className={styles.leftCol}>

            {/* BOLÕES */}
            <div className={styles.panel}>
              <div className={styles.panelTitle}>🎰 Bolões</div>
              <div className={styles.helpBox}>
                <p>Cada bolão é um grupo independente com seu próprio link.</p>
                <p>👉 Crie um bolão → copie o link → compartilhe com o grupo do WhatsApp.</p>
                <p>Participantes acessam o link e se inscrevem naquele bolão específico.</p>
              </div>
              {boloes.length === 0 && !showCreate && (
                <div className={styles.empty}>
                  Nenhum bolão criado. Clique em &quot;+ Novo Bolão&quot; para começar.
                </div>
              )}
              {boloes.map(b => (
                <div key={b.id} className={`${styles.bolaoCard} ${bolaoAtual?.id === b.id ? styles.selected : ''}`}
                  onClick={() => setBolaoAtual(b)}>
                  <div className={styles.bolaoInfo}>
                    <div className={styles.bolaoNome}>{b.nome}</div>
                    <div className={styles.bolaoUrl}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/${b.slug}` : `.../${b.slug}`}
                    </div>
                  </div>
                  <div className={styles.bolaoActions}>
                    {b.ativo && <span className={styles.bolaoAtivo}>ATIVO</span>}
                    <button type="button" className={styles.btnSel} onClick={e => { e.stopPropagation(); copiarLink(b.slug) }}>
                      {linkCopiado ? '✓ Copiado' : '🔗 Copiar'}
                    </button>
                  </div>
                </div>
              ))}

              {!showCreate
                ? <button type="button" className={styles.btnLoad} onClick={() => setShowCreate(true)}>+ Novo Bolão</button>
                : (
                  <div className={styles.createForm}>
                    <input className={styles.createInput} placeholder="Nome do bolão" value={novoNome} onChange={e => setNovoNome(e.target.value)} />
                    <input className={styles.createInput} placeholder="slug (ex: grupo-vip)"
                      value={novoSlug}
                      onChange={e => setNovoSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                    <button type="button" className={styles.btnCreate} onClick={criarBolao} disabled={criando}>
                      {criando ? 'Criando...' : 'Criar Bolão'}
                    </button>
                  </div>
                )
              }
            </div>

            {/* PRÓXIMOS CONCURSOS */}
            <div className={styles.panel}>
              <div className={styles.panelTitle}>🎲 Próximos Concursos</div>
              <button type="button" className={styles.btnLoad} onClick={buscarCaixa} disabled={loadingCaixa}>
                {loadingCaixa ? '⟳ Carregando...' : '🔄 Buscar na Caixa'}
              </button>
              {proximos.map(c => (
                <div key={c.num} className={`${styles.concursoCard} ${String(c.num) === concursoAtivo ? styles.ativo : ''}`}>
                  <div>
                    <div className={styles.ccNum}>#{c.num}</div>
                    <div className={styles.ccData}>{c.data}</div>
                    <div className={styles.ccPremio}>{c.premio}</div>
                  </div>
                  <button type="button"
                    className={`${styles.btnSel} ${String(c.num) === concursoAtivo ? styles.btnSelAtivo : ''}`}
                    onClick={() => selecionarConcurso(c)}
                    title={String(c.num) === concursoAtivo ? 'Clique para atualizar dados' : 'Selecionar'}>
                    {String(c.num) === concursoAtivo ? '✔ Atualizar' : 'Selecionar'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* SENHA */}
          <div className={`${styles.panel} ${styles.panelFull}`}>
            <div className={styles.panelTitle}>🔐 Segurança</div>
            {!showSenha
              ? <button type="button" className={styles.btnLoad} onClick={() => setShowSenha(true)}>🔑 Alterar senha do admin</button>
              : (
                <div className={styles.senhaForm}>
                  <input type="password" className={styles.createInput} placeholder="Senha atual" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
                  <input type="password" className={styles.createInput} placeholder="Nova senha (mín. 6 caracteres)" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
                  <input type="password" className={styles.createInput} placeholder="Confirmar nova senha" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} />
                  {senhaMsg && <div className={styles.senhaMsg}>{senhaMsg}</div>}
                  <div className={styles.senhaActions}>
                    <button type="button" className={styles.btnCreate} onClick={alterarSenha} disabled={salvandoSenha}>
                      {salvandoSenha ? 'Salvando...' : 'Salvar nova senha'}
                    </button>
                    <button type="button" className={styles.btnLoad} onClick={() => { setShowSenha(false); setSenhaMsg('') }}>Cancelar</button>
                  </div>
                </div>
              )
            }
          </div>

          {/* HISTÓRICO */}
          <div className={`${styles.panel} ${styles.panelFull}`}>
            <div className={styles.panelTitle}>📊 Histórico de Concursos</div>
            <button type="button" className={styles.btnLoad} onClick={carregarHistorico}>
              📂 Carregar Histórico
            </button>
            {showHistorico && (
              historico.length === 0
                ? <div className={styles.empty}>Nenhum histórico encontrado</div>
                : <table className={styles.histTable}>
                    <thead>
                      <tr>
                        <th>Concurso</th>
                        <th>Bolão</th>
                        <th>Participantes</th>
                        <th>Pagos</th>
                        <th>Cancelados</th>
                        <th>Arrecadado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((h, i) => (
                        <tr key={i} onClick={() => { setConcursoAtivo(String(h.concurso)); carregarDados() }}>
                          <td>#{h.concurso}</td>
                          <td>{h.bolao_slug ? `/${h.bolao_slug}` : 'Principal'}</td>
                          <td>{h.total}</td>
                          <td>{h.pagos}</td>
                          <td>{h.cancelados > 0 ? h.cancelados : '—'}</td>
                          <td>R$ {h.arrecadado.toFixed(2).replace('.', ',')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
            )}
          </div>

          {/* PARTICIPANTES */}
          <div className={styles.panel}>
            <div className={styles.panelTitle}>👥 Participantes — #{concursoAtivo || '?'}</div>
            <button type="button" className={styles.btnLoad} onClick={carregarDados}>🔄 Atualizar</button>
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
                      ? <span className={styles.statusPago}>✅ Pago</span>
                      : <>
                          <span className={styles.statusPend}>⏳</span>
                          <button type="button" className={styles.btnConfirm} onClick={() => confirmarPagamento(p.id)}>✔ Confirmar</button>
                        </>
                    }
                    <button type="button" className={styles.btnExcluir} onClick={() => excluir(p.id, p.nome)}>✕</button>
                  </div>
                </div>
              ))
            }
          </div>
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
