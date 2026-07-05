'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import TrevoIcon from '@/components/TrevoIcon'
import LoginModal from '@/components/LoginModal'
import UserAuthModal from '@/components/UserAuthModal'
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

function maskTelefone(digits: string): string {
  const v = digits.replace(/\D/g, '').slice(0, 11)
  return v.length <= 2 ? v : v.length <= 7 ? `(${v.slice(0, 2)}) ${v.slice(2)}` : `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

const REGRAS_DEFAULT = [
  { icon: '⚠️', titulo: 'Bolão particular — não oficial', texto: 'Este bolão é organizado de forma particular e independente, sem qualquer vínculo com a Caixa Econômica Federal. A aposta na loteria é realizada pelo administrador em nome do grupo.', destaque: true },
  { icon: '🎰', titulo: 'Como funciona', texto: 'Cada cota representa uma fração proporcional das apostas realizadas. O prêmio líquido (após dedução da taxa de administração) é dividido proporcionalmente ao número de cotas de cada participante em relação ao total de cotas vendidas.' },
  { icon: '💳', titulo: 'Pagamento via PIX', texto: 'Após selecionar suas cotas, você receberá um código PIX para pagamento. Sua inscrição só é confirmada após a validação do pagamento pelo administrador. Pagamentos não confirmados até o fechamento do bolão serão cancelados.' },
  { icon: '🔄', titulo: 'Cotas não vendidas', texto: 'Se o bolão encerrar com cotas não vendidas, o valor arrecadado proporcional a essas cotas será rateado entre os participantes com pagamento confirmado, via PIX complementar.' },
  { icon: '🏆', titulo: 'Premiação e prazo', texto: 'Em caso de prêmio, o administrador tem até 90 dias após o sorteio para resgatar o valor junto à Caixa Econômica Federal. Após dedução da taxa de administração, o saldo é distribuído proporcionalmente entre os participantes.' },
  { icon: '❌', titulo: 'Cancelamento e reembolso', texto: 'Não há reembolso após confirmação do pagamento, salvo cancelamento do bolão pelo administrador antes do sorteio. Em caso de cancelamento, o valor integral pago será devolvido via PIX.' },
]

interface Participante { id: string; nome: string; cotas: string[]; total: number; status: string }
interface ConcursoAtivo { concurso: string; data: string; premio: string }
interface PixData { pixCode: string; qrCodeBase64: string; paymentId: string; fonte: string; nome: string; cotas: string[]; total: number }
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

  const [nome, setNome]                   = useState('')
  const [telefone, setTelefone]           = useState('')
  const [email, setEmail]                 = useState('')
  const [cotasOcupadas, setCotasOcupadas] = useState<string[]>([])
  const [qtdCotas, setQtdCotas]          = useState(1)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState<ConcursoAtivo | null>(null)
  const [pix, setPix]                     = useState<PixData | null>(null)
  const [enviando, setEnviando]           = useState(false)
  const [showTermos, setShowTermos]       = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [intent, setIntent]               = useState<'pagar' | 'carrinho'>('pagar')
  const cart = useCart()
  const [countdown, setCountdown]         = useState('')
  const [payTimer, setPayTimer]           = useState('')
  const [payStep, setPayStep]             = useState(0)
  const [payStatus, setPayStatus]         = useState<'aguardando'|'pago'|'unknown'>('aguardando')
  const [payCreated, setPayCreated]       = useState('')
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const statusRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [apostasData, setApostasData] = useState<{ bets: number[][] } | null>(null)
  const [regras, setRegras] = useState(REGRAS_DEFAULT)
  const [resultadoConf, setResultadoConf] = useState<ResultadoConf | null>(null)
  const [loginAberto, setLoginAberto]     = useState(false)
  const [usuario, setUsuario]             = useState<{ id: string; nome: string; email: string; telefone: string } | null>(null)
  const [userAuthAberto, setUserAuthAberto] = useState(false)
  const [modalPart, setModalPart]         = useState<Participante | null>(null)
  const [nomeVerif, setNomeVerif]         = useState('')
  const [verfErr, setVerfErr]             = useState('')

  const concurso = concursoAtivo?.concurso

  // Autofill: participante logado não precisa redigitar nome/telefone/email
  useEffect(() => {
    fetch('/api/usuario/me').then(r => r.json()).then(d => {
      if (!d.usuario) return
      setUsuario(d.usuario)
      setNome(d.usuario.nome.toUpperCase())
      setTelefone(maskTelefone(d.usuario.telefone))
      setEmail(d.usuario.email)
    }).catch(() => {})
  }, [])

  function onAutenticado(u: { id: string; nome: string; email: string; telefone: string }) {
    setUsuario(u)
    setNome(u.nome.toUpperCase())
    setTelefone(maskTelefone(u.telefone))
    setEmail(u.email)
  }

  useEffect(() => {
    fetch('/api/config-publica').then(r => r.json()).then(d => {
      const loteriaKey = (loteria || 'mega').toLowerCase()
      const r = d?.bolao?.[loteriaKey]?.regras
      if (Array.isArray(r) && r.length) {
        setRegras(r.map((txt: string, i: number) => ({
          icon: REGRAS_DEFAULT[i]?.icon ?? '📌',
          titulo: REGRAS_DEFAULT[i]?.titulo ?? `Regra ${i + 1}`,
          texto: txt,
          destaque: i === 0,
        })))
      }
    }).catch(() => {})
  }, [loteria])

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

  async function confirmar() {
    if (!usuario)                { alert('⚠️ Entre ou cadastre-se para participar.'); return }
    if (!nome.trim())            { alert('⚠️ Informe seu nome completo!'); return }
    if (telefone.replace(/\D/g,'').length < 11) { alert('⚠️ Informe seu WhatsApp com DDD (ex: 19 99999-9999)!'); return }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('⚠️ E-mail inválido.'); return }
    if (!concurso)               { alert('⚠️ Nenhum concurso ativo.'); return }
    if (!selecionadas.length)    { alert('⚠️ Selecione ao menos uma cota!'); return }
    setEnviando(true)
    try {
      const total = selecionadas.length * VALOR_COTA
      const pixRes = await fetch('/api/pix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurso: parseInt(concurso), nome: nome.trim().toUpperCase(), cotas: selecionadas.sort(), total }),
      }).then(r => r.json())
      const reg = await fetch('/api/participantes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurso: parseInt(concurso), nome: nome.trim().toUpperCase(), telefone: '55' + telefone.replace(/\D/g,''), email: email.trim().toLowerCase() || null, cotas: selecionadas.sort(), total, mp_payment_id: pixRes.paymentId, pix_code: pixRes.pixCode, bolao_slug: bolaoSlug, usuario_id: usuario?.id || null }),
      }).then(r => r.json())
      if (reg.error) { alert('⚠️ ' + reg.error); return }
      const cotasSalvas = [...selecionadas].sort()
      setPix({ ...pixRes, nome: nome.trim().toUpperCase(), cotas: cotasSalvas, total: cotasSalvas.length * VALOR_COTA })
      setNome(''); setTelefone(''); setEmail(''); setQtdCotas(1); recarregar()
      let secs = 30 * 60
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => { secs--; const m = String(Math.floor(secs/60)).padStart(2,'0'); const s = String(secs%60).padStart(2,'0'); setPayTimer(`${m}:${s}`); if (secs<=0) clearInterval(timerRef.current!) }, 1000)
      setPayTimer('30:00'); setPayStep(0); setPayStatus('aguardando'); setPayCreated(new Date().toLocaleString('pt-BR'))
      if (statusRef.current) clearInterval(statusRef.current)
      const pid = pixRes.paymentId
      statusRef.current = setInterval(async () => {
        const r = await fetch(`/api/status?paymentId=${pid}`); const d = await r.json()
        if (d.status === 'pago') { setPayStatus('pago'); setPayStep(2); clearInterval(statusRef.current!); clearInterval(timerRef.current!); recarregar() }
      }, 5000)
    } finally { setEnviando(false) }
  }

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
    alert('🛒 Adicionado ao carrinho! Acesse o carrinho (ícone no topo da home) para finalizar o pagamento.')
  }

  async function copiarPix() {
    if (!pix) return
    await navigator.clipboard.writeText(pix.pixCode)
    alert('✅ Código PIX copiado!')
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
          <button className={styles.headerBtn} aria-label="Admin" onClick={() => setLoginAberto(true)}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>settings</span>
          </button>
        </div>
        {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} />}
        {userAuthAberto && (
          <UserAuthModal onClose={() => setUserAuthAberto(false)} onAutenticado={onAutenticado} />
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
                  {/* Dados pessoais */}
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Nome completo *</label>
                    <input className={`${styles.fieldInput} ${styles.fieldInputUpper}`}
                      type="text" value={nome}
                      onChange={e => setNome(e.target.value.toUpperCase())}
                      placeholder="SEU NOME COMPLETO" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>Celular com DDD (WhatsApp) *</label>
                    <input className={styles.fieldInput}
                      type="tel" value={telefone} inputMode="numeric"
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g,'').slice(0,11)
                        const f = v.length <= 2 ? v : v.length <= 7 ? `(${v.slice(0,2)}) ${v.slice(2)}` : `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
                        setTelefone(f)
                      }}
                      placeholder="(19) 99999-9999" />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.fieldLabel}>E-mail (opcional)</label>
                    <input className={styles.fieldInput}
                      type="email" value={email} inputMode="email" autoComplete="email"
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com" />
                  </div>

                  <hr className={styles.divider} />
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
                      onClick={() => { if (!selecionadas.length) { alert('⚠️ Selecione ao menos uma cota!'); return } setIntent('pagar'); setAceitouTermos(false); setShowTermos(true) }}
                      disabled={enviando || !selecionadas.length}>
                      Ir para Pagamento
                    </button>
                    <button type="button" className={styles.btnFechar} style={{ marginTop: 8 }}
                      onClick={() => { if (!selecionadas.length) { alert('⚠️ Selecione ao menos uma cota!'); return } setIntent('carrinho'); setAceitouTermos(false); setShowTermos(true) }}
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

      {/* ── Modal de Termos ── */}
      {showTermos && !pix && (
        <div className={styles.overlay} style={corStyle}>
          <div className={styles.overlayBox}>
            <div className={styles.termosHeader}>
              <div className={styles.termosTitulo}>📋 Termos de Participação</div>
              <div className={styles.termosBolao}>{bolaoNome}</div>
            </div>
            <div className={styles.termosResumo}>
              <div className={styles.termosLinha}><span className={styles.termosIc}>🎟️</span><span>Cotas: <strong>{selecionadas.sort().join(', ')}</strong></span></div>
              <div className={styles.termosLinha}><span className={styles.termosIc}>💰</span><span>Total: <strong>R$ {total.toFixed(2).replace('.', ',')}</strong></span></div>
              <div className={styles.termosLinha}><span className={styles.termosIc}>🎲</span><span>Apostas: <strong>{numApostas}</strong> de <strong>{dezenas}</strong> dezenas</span></div>
            </div>
            <div className={styles.termosLista}>
              {regras.map((r, i) => (
                <div key={i} className={styles.termosRegra}>
                  <div className={styles.termosRegraTitulo}>{r.icon} {r.titulo}</div>
                  <div className={styles.termosRegraDesc}>{r.texto}</div>
                </div>
              ))}
            </div>
            <label className={styles.termosCheckLabel}>
              <input type="checkbox" className={styles.termosCheck} checked={aceitouTermos} onChange={e => setAceitouTermos(e.target.checked)} />
              <span>Li e concordo com as regras de participação deste bolão</span>
            </label>
            <button type="button" className={styles.btn}
              onClick={() => { if (aceitouTermos) { setShowTermos(false); if (intent === 'carrinho') adicionarAoCarrinho(); else confirmar() } }}
              disabled={!aceitouTermos || enviando}>
              {intent === 'carrinho' ? '🛒 Confirmar e Adicionar ao Carrinho' : (enviando ? '⏳ Gerando PIX...' : '✅ Confirmar e Gerar PIX')}
            </button>
            <button type="button" className={styles.btnFechar} onClick={() => setShowTermos(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Modal PIX ── */}
      {pix && (
        <div className={styles.overlay} style={corStyle}>
          <div className={styles.overlayBox}>
            {/* Stepper */}
            <div className={styles.stepper}>
              {['Aguardando\nPagamento', 'Em\nProcessamento', 'Pagamento\nConfirmado'].map((label, i) => (
                <div key={i} className={styles.stepWrap}>
                  {i > 0 && <div className={`${styles.stepLine} ${payStep >= i ? styles.stepLineDone : ''}`} />}
                  <div className={styles.stepItem}>
                    <div className={`${styles.stepDot} ${payStep >= i ? styles.stepDotActive : ''} ${payStep === i ? styles.stepDotCurrent : ''}`}>
                      {payStep > i ? '✓' : payStep === i ? '◆' : ''}
                    </div>
                    {payStep === i && <div className={styles.stepLabel}>{label.split('\n').map((l,k) => <span key={k}>{l}<br/></span>)}</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* Recibo */}
            <div className={styles.receiptCard}>
              <div className={styles.receiptPixRow}>
                <span className={styles.receiptMeio}>Meio de pagamento:</span>
                <span className={styles.pixLogo}>◈ pix</span>
              </div>
              <div className={styles.receiptGrid}>
                <div><span className={styles.receiptLbl}>Bolão: </span><span className={styles.receiptVal}>{bolaoNome}</span></div>
                <div><span className={styles.receiptLbl}>ID: </span><span className={styles.receiptVal}>{pix.paymentId.substring(0,16)}</span></div>
                <div>
                  <span className={styles.receiptLbl}>Situação: </span>
                  <span className={`${styles.receiptSituacao} ${payStatus === 'pago' ? styles.receiptSituacaoPago : ''}`}>
                    {payStatus === 'pago' ? 'Confirmado' : 'Em Processamento'}
                  </span>
                </div>
                <div><span className={styles.receiptLbl}>Data: </span><span className={styles.receiptVal}>{payCreated}</span></div>
              </div>
            </div>

            {payStatus !== 'pago' && (<>
              <div className={styles.scanTitle}>Escaneie o código a seguir</div>
              <img className={styles.qrCode} src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" />
              <div className={styles.copyTitle}>Ou copie este código</div>
              <div className={styles.copyInstruction}>No app do seu banco, escolha pagamento via PIX e cole o código abaixo</div>
              <div className={styles.codeRow}>
                <div className={styles.codeText}>{pix.pixCode}</div>
                <button type="button" className={styles.copyBtn} onClick={copiarPix}>📋 Copiar código PIX</button>
              </div>
              {payTimer && <div className={styles.payTimer}>⊙ Você tem <strong>{payTimer}</strong> para efetuar o pagamento</div>}
            </>)}

            {payStatus === 'pago' && (
              <div className={styles.comprovante}>
                <div className={styles.compHeader}>
                  <span className={styles.compCheckIcon}>✅</span>
                  <div className={styles.compTitulo}>Comprovante de Participação</div>
                  <div className={styles.compData}>{payCreated}</div>
                </div>
                <div className={styles.compValor} style={{ color: loteriaCor }}>
                  R$ {pix.total.toFixed(2).replace('.', ',')}
                </div>
                <div className={styles.compTimeline}>
                  <div className={styles.compTimelineCol}>
                    <div className={styles.compDot} />
                    <div className={styles.compVline} />
                    <div className={styles.compDot} />
                  </div>
                  <div className={styles.compTimelineInfo}>
                    <div className={styles.compParty}>
                      <div className={styles.compPartyLabel}>De</div>
                      <div className={styles.compPartyNome}>{pix.nome}</div>
                      <div className={styles.compPartyDetalhe}>Cotas adquiridas: {pix.cotas.join(', ')}</div>
                    </div>
                    <div className={styles.compParty}>
                      <div className={styles.compPartyLabel}>Para</div>
                      <div className={styles.compPartyNome}>{bolaoNome}</div>
                      <div className={styles.compPartyDetalhe}>Administrador do Bolão</div>
                      <div className={styles.compPartyDetalhe}>{numApostas} apostas · {dezenas} dezenas</div>
                    </div>
                  </div>
                </div>
                <div className={styles.compIds}>
                  <div className={styles.compIdRow}>
                    <span className={styles.compIdLbl}>ID da transação</span>
                    <span className={styles.compIdVal}>{pix.paymentId}</span>
                  </div>
                </div>
                <div className={styles.compTermos}>
                  <div className={styles.compTermosTitulo}>📋 Termos Aceitos</div>
                  {regras.map((r, i) => (
                    <div key={i} className={styles.compTermosItem}>
                      <span>{r.icon}</span>
                      <span><strong>{r.titulo}:</strong> {r.texto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="button" className={styles.btnFechar}
              onClick={() => { setPix(null); if(timerRef.current) clearInterval(timerRef.current); if(statusRef.current) clearInterval(statusRef.current) }}>
              Fechar
            </button>
          </div>
        </div>
      )}

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
