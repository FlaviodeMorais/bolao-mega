'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import TrevoIcon from '@/components/TrevoIcon'
import LoginModal from '@/components/LoginModal'
import UserAuthModal from '@/components/UserAuthModal'
import UserAccountModal from '@/components/UserAccountModal'
import { useCart } from '@/components/CartContext'
import { getLoteria } from '@/lib/loterias'
import styles from './bolao.module.css'

// Cor principal por loteria
const LOTERIA_COR: Record<string, string> = {
  mega:      '#00AB67',
  quina:     '#005DA4',
  lotofacil: '#803594',
  lotomania: '#F58220',
}

const DIAS_ABR = ['dom.','seg.','ter.','qua.','qui.','sex.','sáb.']

function formatSorteioData(dataStr: string): string {
  const m = dataStr.match(/^(\d{1,2})\/(\d{2})\/(\d{4})/)
  if (!m) return dataStr
  const dt = new Date(+m[3], +m[2] - 1, +m[1])
  const dataFmt = `${m[1].padStart(2, '0')}/${m[2]}/${m[3]}`
  return `${DIAS_ABR[dt.getDay()]}, ${dataFmt}`
}

function mascaraNome(nome: string): string {
  const words = nome.trim().split(/\s+/)
  const maskWord = (w: string, pos: 'first' | 'last' | 'single') => {
    if (w.length <= 2) return w.slice(0, 2).padEnd(w.length, '*')
    if (pos === 'first' || pos === 'single')
      return w.slice(0, 2) + '*'.repeat(Math.max(1, w.length - 2))
    return '*'.repeat(Math.max(1, w.length - 2)) + w.slice(-2)
  }
  if (words.length === 1) return maskWord(words[0], 'single')
  const fm = maskWord(words[0], 'first')
  const lm = maskWord(words[words.length - 1], 'last')
  return `${fm} ${lm}`
}

interface Participante { id: string; nome: string; cotas: string[]; total: number; status: string }
interface ConcursoAtivo { concurso: string; data: string; premio: string }
interface ResultadoConf {
  status: 'nao_apurado'|'aguardando_apuracao'|'apurando'|'nao_premiada'|'ganhamos'
  data_sorteio?: string
  dezenas_sorteadas?: number[]
  resumo?: { senas: number; quinas: number; quadras: number }
  maior_premio?: string | null
  apostas_premiadas?: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
}

interface Props {
  bolaoNome: string
  bolaoSlug: string
  loteria?: string
  valorCota: number
  totalCotas: number
  dezenas: number
  numApostas: number
  taxaAdmin: number
  encerrado: boolean
}

export default function BolaoForm({ bolaoNome: bolaoNomeProp, bolaoSlug, loteria, valorCota, totalCotas, dezenas: dezenasProp, numApostas: numApostasProp, taxaAdmin: taxaAdminProp, encerrado: encerradoProp }: Props) {
  const loteriaCfg   = getLoteria(loteria)
  const loteriaLabel = loteriaCfg.label
  const loteriaCor   = LOTERIA_COR[loteria ?? 'mega'] ?? '#00AB67'

  const [VALOR_COTA, setValorCota]     = useState(0)
  const [TOTAL_COTAS, setTotalCotas]   = useState(Number(totalCotas) || 20)
  const [dezenas, setDezenas]          = useState(Number(dezenasProp) || 6)
  const [numApostas, setNumApostas]    = useState(Number(numApostasProp) || 1)
  const [bolaoNome, setBolaoNome]      = useState(bolaoNomeProp)
  const [encerrado, setEncerrado]      = useState(encerradoProp)
  const [configOk, setConfigOk]        = useState(false)

  const [cotasOcupadas, setCotasOcupadas] = useState<string[]>([])
  const [qtdCotas, setQtdCotas]          = useState(1)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState<ConcursoAtivo | null>(null)
  const [enviando, setEnviando]           = useState(false)
  const cart = useCart()
  const [countdown, setCountdown]         = useState('')
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const [apostasData, setApostasData] = useState<{ bets: number[][] } | null>(null)
  const [resultadoConf, setResultadoConf] = useState<ResultadoConf | null>(null)
  const [loginAberto, setLoginAberto]     = useState(false)
  const [usuario, setUsuario]             = useState<{ id: string; nome: string; email: string; telefone: string; chave_pix?: string } | null>(null)
  const [userAuthAberto, setUserAuthAberto] = useState(false)
  const [contaAberta, setContaAberta]     = useState(false)
  const [modalPart, setModalPart]         = useState<Participante | null>(null)
  const [nomeVerif, setNomeVerif]         = useState('')
  const [verfErr, setVerfErr]             = useState('')

  const concurso = concursoAtivo?.concurso

  // Autofill: participante logado não precisa redigitar nome/telefone/email
  useEffect(() => {
    fetch('/api/usuario/me').then(r => r.json()).then(d => {
      if (!d.usuario) return
      setUsuario(d.usuario)
    }).catch(() => {})
  }, [])

  function onAutenticado(u: { id: string; nome: string; email: string; telefone: string }) {
    setUsuario(u)
  }

  function verificarIdentidade() {
    if (!modalPart) return
    const entrada    = nomeVerif.trim().toLowerCase()
    const cadastrado = modalPart.nome.trim().toLowerCase()
    if (entrada === cadastrado) {
      const url = `/comprovante?id=${modalPart.id}&pub=1`
        + (bolaoSlug ? `&bolao=${bolaoSlug}` : '')
        + (concurso  ? `&concurso=${concurso}` : '')
      window.open(url, '_blank')
      setModalPart(null); setNomeVerif(''); setVerfErr('')
    } else {
      setVerfErr('❌ Nome não confere com o cadastro. Tente novamente.')
    }
  }

  useEffect(() => {
    setConfigOk(false)
    // Busca concurso admin + prêmio fresco da Caixa em paralelo
    const concursoFetch = Promise.all([
      fetch(`/api/concurso-ativo?loteria=${loteriaCfg.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/resultados/${loteriaCfg.apiSlug}`).then(r => r.json()).catch(() => null),
    ]).then(([ca, fresh]) => {
      const val = fresh?.valorEstimadoProximoConcurso
      const premioFresh = val ? `R$ ${(val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi` : null
      if (ca?.concurso) {
        // Prêmio fresco tem prioridade; data do admin se tiver ano, senão usa Caixa
        const dataAdmin: string = ca.data || ''
        const dataCaixa: string = fresh?.dataProximoConcurso || ''
        const data = /\d{4}/.test(dataAdmin) ? dataAdmin : (dataCaixa || dataAdmin)
        return { concurso: ca.concurso, data, premio: premioFresh || ca.premio || 'Acumulando' }
      }
      if (!fresh?.numero) return null
      return { concurso: String((fresh.numero || 0) + 1), data: fresh.dataProximoConcurso || '', premio: premioFresh || 'Acumulando' }
    }).catch(() => null)

    Promise.all([concursoFetch, fetch('/api/boloes').then(r => r.json())]).then(([ca, d]) => {
      if (ca) setConcursoAtivo(ca)
      const num = String(ca?.concurso || '')
      const b = (d.boloes || []).find((x: { slug: string }) => x.slug === bolaoSlug)
      if (b) {
        setValorCota(Number(b.valor_cota) || 0)
        setTotalCotas(Number(b.total_cotas) || 20)
        setDezenas(Number(b.dezenas) || 6)
        setNumApostas(Number(b.num_apostas) || 1)
        setBolaoNome(b.nome || bolaoNomeProp)
        setEncerrado(!!b.encerrado)
        setResultadoConf(b.resultado_conferencia || null)
        setApostasData(b.apostas_data || null)
      }
      if (num) {
        Promise.all([
          fetch(`/api/cotas?concurso=${num}&bolao=${bolaoSlug}`).then(r => r.json()),
          fetch(`/api/participantes?concurso=${num}&bolao=${bolaoSlug}`).then(r => r.json()),
        ]).then(([c, p]) => {
          setCotasOcupadas(c.cotas || []); setParticipantes(p.participantes || []); setConfigOk(true)
        })
      } else { setConfigOk(true) }
    }).catch(() => setConfigOk(false))
  }, [bolaoSlug, bolaoNomeProp])

  useEffect(() => {
    const atualizar = () => {
      const caFetch = Promise.all([
        fetch(`/api/concurso-ativo?loteria=${loteriaCfg.id}`).then(r => r.json()).catch(() => null),
        fetch(`/api/resultados/${loteriaCfg.apiSlug}`).then(r => r.json()).catch(() => null),
      ]).then(([ca, fresh]) => {
        const val = fresh?.valorEstimadoProximoConcurso
        const premioFresh = val ? `R$ ${(val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi` : null
        if (ca?.concurso) {
          const dataAdmin: string = ca.data || ''
          const dataCaixa: string = fresh?.dataProximoConcurso || ''
          const data = /\d{4}/.test(dataAdmin) ? dataAdmin : (dataCaixa || dataAdmin)
          return { concurso: ca.concurso, data, premio: premioFresh || ca.premio || 'Acumulando' }
        }
        if (!fresh?.numero) return null
        return { concurso: String((fresh.numero || 0) + 1), data: fresh.dataProximoConcurso || '', premio: premioFresh || 'Acumulando' }
      }).catch(() => null)
      Promise.all([fetch('/api/boloes').then(r => r.json()), caFetch]).then(([d, ca]) => {
        if (ca) setConcursoAtivo(ca)
        const b = (d.boloes || []).find((x: { slug: string }) => x.slug === bolaoSlug)
        if (!b) return
        setValorCota(Number(b.valor_cota) || 0); setTotalCotas(Number(b.total_cotas) || 20)
        setDezenas(Number(b.dezenas) || 6); setNumApostas(Number(b.num_apostas) || 1)
        setBolaoNome(b.nome || bolaoNomeProp); setEncerrado(!!b.encerrado)
        setResultadoConf(b.resultado_conferencia || null); setApostasData(b.apostas_data || null)
      }).catch(() => {})
    }
    window.addEventListener('focus', atualizar)
    const intervalo = setInterval(atualizar, 60000)
    return () => { window.removeEventListener('focus', atualizar); clearInterval(intervalo) }
  }, [bolaoSlug, bolaoNomeProp])

  useEffect(() => {
    if (!concursoAtivo?.data) return
    const dateMatch = concursoAtivo.data.match(/(\d{1,2})\/(\d{2})/)
    if (!dateMatch) return
    const [, dd, mm] = dateMatch.map(Number)
    const horaMatch = concursoAtivo.data.match(/(\d{1,2})h(\d{2})?/)
    const hora = horaMatch ? parseInt(horaMatch[1]) : 20
    const min  = horaMatch?.[2] ? parseInt(horaMatch[2]) : 0
    const draw = new Date(new Date().getFullYear(), mm - 1, dd, hora, min, 0)
    const tick = () => {
      const diff = draw.getTime() - Date.now()
      if (diff <= 0) { setCountdown('Apostas encerradas'); return }
      setCountdown(`${Math.floor(diff/3600000)}h ${Math.floor((diff%3600000)/60000)}min`)
    }
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id)
  }, [concursoAtivo?.data])

  const recarregar = useCallback(async () => {
    const num = concursoAtivo?.concurso
    if (!num) return
    const [c, p] = await Promise.all([
      fetch(`/api/cotas?concurso=${num}&bolao=${bolaoSlug}`).then(r => r.json()),
      fetch(`/api/participantes?concurso=${num}&bolao=${bolaoSlug}`).then(r => r.json()),
    ])
    setCotasOcupadas(c.cotas || []); setParticipantes(p.participantes || [])
  }, [concursoAtivo?.concurso, bolaoSlug])

  useEffect(() => {
    if (!concursoAtivo?.concurso) return
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(recarregar, 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [recarregar, concursoAtivo?.concurso])

  function adicionarAoCarrinho() {
    if (!usuario) { alert('⚠️ Entre ou cadastre-se para continuar.'); return }
    if (!concurso) { alert('⚠️ Nenhum concurso ativo.'); return }
    if (!selecionadas.length) { alert('⚠️ Selecione ao menos uma cota!'); return }
    cart.addItem({
      tipo: 'loteria',
      bolaoSlug,
      bolaoNome,
      loteria: loteria || 'mega',
      concurso: parseInt(concurso),
      cotas: [...selecionadas].sort(),
      valorCota: VALOR_COTA,
      total,
    })
    setQtdCotas(1)
    alert('🛒 Adicionado ao carrinho! Acesse o carrinho (ícone no topo) para finalizar o pagamento.')
  }

  const todasCotas    = Array.from({ length: TOTAL_COTAS }, (_, i) => String(i + 1).padStart(2, '0'))
  const disponiveisList = todasCotas.filter(c => !cotasOcupadas.includes(c))
  const selecionadas  = disponiveisList.slice(0, Math.min(qtdCotas, disponiveisList.length))
  const total         = selecionadas.length * VALOR_COTA
  const disp          = TOTAL_COTAS - cotasOcupadas.length

  // CSS var injetada inline para que todas as classes com var(--lot-cor) usem a cor certa
  const corStyle = { '--lot-cor': loteriaCor } as React.CSSProperties

  return (
    <>
      <div className={styles.page} style={corStyle}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <a href="/" className={styles.headerBack} aria-label="Voltar">
            <span className="material-icons-round" style={{ fontSize: 18 }}>arrow_back</span>
          </a>
          <div className={styles.headerBrand}>
            {loteriaLabel.toUpperCase()}
            <span className={styles.headerSub}>{bolaoNome}</span>
          </div>
          {usuario ? (
            <button className={styles.headerBtn} aria-label="Minha conta" title={usuario.email} onClick={() => setContaAberta(true)}>
              <span className="material-icons-round" style={{ fontSize: 18 }}>person</span>
            </button>
          ) : (
            <button className={styles.headerBtn} aria-label="Entrar" onClick={() => setUserAuthAberto(true)}>
              <span className="material-icons-round" style={{ fontSize: 18 }}>login</span>
            </button>
          )}
          <a className={styles.headerBtn} aria-label="Carrinho" href="/carrinho" style={{ position: 'relative', textDecoration: 'none' }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>shopping_cart</span>
            {cart.items.length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#00AB67', color: '#fff', borderRadius: '50%',
                width: 16, height: 16, fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{cart.items.length}</span>
            )}
          </a>
          <button className={styles.headerBtn} aria-label="Admin" onClick={() => setLoginAberto(true)}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>settings</span>
          </button>
        </div>
        {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} />}
        {userAuthAberto && (
          <UserAuthModal onClose={() => setUserAuthAberto(false)} onAutenticado={onAutenticado} />
        )}
        {contaAberta && usuario && (
          <UserAccountModal usuario={usuario} onClose={() => setContaAberta(false)}
            onLogout={() => { setUsuario(null); setContaAberta(false) }}
            onChavePixAtualizada={chave_pix => setUsuario(u => u ? { ...u, chave_pix } : u)} />
        )}

        {/* ── Hero: concurso ── */}
        {concursoAtivo?.concurso && (
          <div className={styles.heroCard}>
            <div className={styles.heroInner}>
              <div className={styles.heroHead}>
                <TrevoIcon size={22} loteria={loteria ?? 'mega'} />
                <span className={styles.heroTitle}>{loteriaLabel.toUpperCase()}</span>
                <span className={styles.heroBadge}>Concurso #{concursoAtivo.concurso}</span>
              </div>
              <div className={styles.heroBody}>
                <div className={styles.heroPremio} style={{ color: loteriaCor }}>
                  {concursoAtivo.premio || '—'}
                </div>
                <div className={styles.heroPremioLabel}>Prêmio estimado</div>

                {concursoAtivo.data && (
                  <div className={styles.heroRow}>
                    <div className={styles.heroInfo}>
                      <div className={styles.heroInfoLabel}>Sorteio</div>
                      <div className={styles.heroInfoVal}>{formatSorteioData(concursoAtivo.data)}</div>
                    </div>
                    {countdown && (
                      <div className={styles.heroCountdown}>
                        <div className={styles.heroInfoLabel}>Faltam</div>
                        <div className={styles.heroCountdownVal}>{countdown}</div>
                      </div>
                    )}
                  </div>
                )}

                <hr className={styles.heroDivider} />
                <div className={styles.heroStats}>
                  <div className={styles.heroStat}>
                    <div className={styles.heroStatVal} style={{ color: loteriaCor }}>{disp}/{TOTAL_COTAS}</div>
                    <span className={styles.heroStatLbl}>Cotas Livres</span>
                  </div>
                  <div className={styles.heroStatSep} />
                  <div className={styles.heroStat}>
                    <div className={styles.heroStatVal} style={{ color: loteriaCor }}>{participantes.length}</div>
                    <span className={styles.heroStatLbl}>Participantes</span>
                  </div>
                  <div className={styles.heroStatSep} />
                  <div className={styles.heroStat}>
                    <div className={styles.heroStatVal} style={{ color: loteriaCor }}>{numApostas}</div>
                    <span className={styles.heroStatLbl}>Apostas</span>
                  </div>
                  <div className={styles.heroStatSep} />
                  <div className={styles.heroStat}>
                    <div className={styles.heroStatVal} style={{ color: loteriaCor }}>{dezenas}</div>
                    <span className={styles.heroStatLbl}>Dezenas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Apostas do bolão ── */}
        {apostasData?.bets && apostasData.bets.length > 0 && (
          <div className={styles.secWrap}>
            <div className={styles.secCard}>
              <div className={styles.secHead}>
                <TrevoIcon size={18} loteria={loteria ?? 'mega'} />
                <span className={styles.secTitle}>
                  {apostasData.bets.length} apostas · {apostasData.bets[0]?.length} dezenas
                </span>
              </div>
              <div className={styles.apostasLista}>
                {(() => {
                  const acertos = new Set<number>(resultadoConf?.dezenas_sorteadas ?? [])
                  return apostasData.bets.map((aposta, i) => (
                    <div key={i} className={styles.apostaRow}>
                      <span className={styles.apostaIdx}>{i + 1}</span>
                      <div className={styles.apostaBolas} style={{ '--n': aposta.length } as React.CSSProperties}>
                        {aposta.map(n => (
                          <span key={n} className={acertos.size > 0 && acertos.has(n) ? `${styles.apostaBola} ${styles.apostaBolaAcerto}` : styles.apostaBola}>
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ── Bolão encerrado ── */}
        {encerrado && (
          <div className={styles.secWrap}>
            <div className={styles.secCard}>
              <div className={styles.encerradoBanner}>
                <div className={styles.encIcon}>⛔</div>
                <div className={styles.encTitle}>Bolão Encerrado</div>
                <div className={styles.encSub}>
                  Este bolão foi encerrado pelo administrador.<br/>
                  Se você é participante, verifique seu <strong>WhatsApp</strong> para o PIX de complemento de pagamento.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Formulário de inscrição ── */}
        {!encerrado && (
          <div className={styles.secWrap}>
            <div className={styles.secCard}>
              <div className={styles.secBody}>

                {!usuario ? (
                  /* ── Gate de login: participar exige conta ── */
                  <div className={styles.loginGate}>
                    <div className={styles.loginGateIcon}>🔒</div>
                    <div className={styles.loginGateTitulo}>Entre para participar</div>
                    <div className={styles.loginGateTexto}>
                      Crie uma conta rápida (ou entre na sua) para não precisar redigitar seus dados a cada bolão.
                    </div>
                    <button type="button" className={styles.btn} onClick={() => setUserAuthAberto(true)}>
                      Entrar ou Cadastrar
                    </button>
                  </div>
                ) : (<>
                  <div className={styles.secSubTitle}>🎟️ Selecionar Cotas</div>

                  {!configOk && <div className={styles.loadingMsg}>⏳ Carregando configuração...</div>}
                  {configOk && VALOR_COTA === 0 && (
                    <div className={styles.loadingMsg}>⚠️ Bolão aguardando configuração do administrador.</div>
                  )}

                  {configOk && VALOR_COTA > 0 && (<>
                    <div className={styles.cotasProgress}>
                      <div className={styles.cotasProgressInfo}>
                        <span className={styles.cotasProgressLabel}>Cotas vendidas</span>
                        <span className={styles.cotasProgressNums}><strong>{cotasOcupadas.length}</strong>/{TOTAL_COTAS}</span>
                      </div>
                      <div className={styles.cotasProgressBar}>
                        <div className={styles.cotasProgressFill}
                          style={{ width: `${Math.round((cotasOcupadas.length / TOTAL_COTAS) * 100)}%` }} />
                      </div>
                      {disp <= 2 && disp > 0 && (
                        <div className={styles.cotasUrgente}>⚡ Últimas {disp} cota{disp !== 1 ? 's' : ''}!</div>
                      )}
                    </div>

                    <div className={styles.qtdWrap}>
                      <div className={styles.qtdInfo}>
                        <div className={styles.qtdLabel}>Quantidade de cotas</div>
                        <div className={styles.qtdPreco}>R$ {VALOR_COTA.toFixed(2).replace('.', ',')} / cota</div>
                      </div>
                      <div className={styles.qtdRow}>
                        <button type="button" className={styles.qtdBtn} onClick={() => setQtdCotas(q => Math.max(1, q - 1))}>−</button>
                        <input className={styles.qtdInput} type="number" min={1} max={disp} value={qtdCotas}
                          onChange={e => setQtdCotas(Math.min(disp, Math.max(1, parseInt(e.target.value) || 1)))} />
                        <button type="button" className={styles.qtdBtn} onClick={() => setQtdCotas(q => Math.min(disp, q + 1))}>+</button>
                      </div>
                    </div>

                    <div className={styles.totalBar}>
                      <div>
                        <div className={styles.totalLabel}>Total a pagar</div>
                        <div className={styles.totalCotas}>{selecionadas.length} cota{selecionadas.length !== 1 ? 's' : ''}</div>
                      </div>
                      <div className={styles.totalVal} style={{ color: loteriaCor }}>
                        R$ {total.toFixed(2).replace('.', ',')}
                      </div>
                    </div>

                    <button type="button" className={styles.btn}
                      onClick={adicionarAoCarrinho}
                      disabled={enviando || !selecionadas.length}>
                      🛒 Adicionar ao Carrinho
                    </button>
                  </>)}
                </>)}

                {/* Participantes */}
                {participantes.length > 0 && (<>
                  <hr className={styles.divider} />
                  <div className={styles.secSubTitle}>👥 Participantes</div>

                  {resultadoConf && (
                    <div className={styles.sorteioResultado}>
                      <div className={`${styles.statusSorteio} ${resultadoConf.status === 'ganhamos' ? styles.statusGanhamos : ''}`}>
                        {resultadoConf.status === 'nao_apurado'        && `⏳ Sorteio não apurado${resultadoConf.data_sorteio ? ` — ${resultadoConf.data_sorteio}` : ''}`}
                        {resultadoConf.status === 'aguardando_apuracao' && '🎲 Aguardando apuração — resultado após 22h'}
                        {resultadoConf.status === 'apurando'            && '🔄 Apuração em andamento...'}
                        {resultadoConf.status === 'nao_premiada'        && '😔 Não premiada neste concurso'}
                        {resultadoConf.status === 'ganhamos'            && `🏆 GANHAMOS! — ${resultadoConf.maior_premio}`}
                      </div>
                      {/* BUG CORRIGIDO: era === 6, agora funciona para qualquer loteria */}
                      {resultadoConf.dezenas_sorteadas && resultadoConf.dezenas_sorteadas.length > 0 && (
                        <div className={styles.sorteioDezenas}>
                          <div className={styles.sorteioDezenasLabel}>Dezenas sorteadas</div>
                          <div className={styles.sorteioDezenasGrid} style={{ '--n': resultadoConf.dezenas_sorteadas.length } as React.CSSProperties}>
                            {resultadoConf.dezenas_sorteadas.map(n => (
                              <span key={n} className={styles.sorteioBall}>
                                {String(n).padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className={styles.pBox}>
                    {participantes.map(p => (
                      <div className={styles.pRow} key={p.id}>
                        <span className={styles.pNome}>{mascaraNome(p.nome)}</span>
                        <span className={styles.pCotas}>{Array.isArray(p.cotas) ? p.cotas.join(', ') : p.cotas}</span>
                        {p.status === 'pago' ? (
                          <button type="button" className={styles.pPago}
                            onClick={() => { setModalPart(p); setNomeVerif(''); setVerfErr('') }}>
                            ✅ PAGO
                          </button>
                        ) : (
                          <span className={styles.pPendente}>⏳</span>
                        )}
                      </div>
                    ))}
                  </div>
                </>)}

                <div className={styles.footer}>
                  <strong>Boa sorte! 🍀</strong><br />Dúvidas? Fale com o administrador.
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ── Modal verificação de identidade ── */}
      {modalPart && (
        <div className={styles.modalOverlay} style={corStyle} onClick={e => { if (e.target === e.currentTarget) setModalPart(null) }}>
          <div className={styles.modalBox}>
            <div className={styles.modalTitle}>🔒 Verificar identidade</div>
            <p className={styles.modalDesc}>Digite seu <strong>nome completo</strong> conforme cadastrado para visualizar seu comprovante.</p>
            <input className={styles.modalInput} type="text" placeholder="Seu nome completo"
              value={nomeVerif} autoFocus
              onChange={e => { setNomeVerif(e.target.value); setVerfErr('') }}
              onKeyDown={e => { if (e.key === 'Enter') verificarIdentidade() }} />
            {verfErr && <div className={styles.modalErr}>{verfErr}</div>}
            <div className={styles.modalActions}>
              <button type="button" className={styles.modalBtnCancel} onClick={() => setModalPart(null)}>Cancelar</button>
              <button type="button" className={styles.modalBtnConfirm} onClick={verificarIdentidade}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
