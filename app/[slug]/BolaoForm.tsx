'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import TrevoIcon from '@/components/TrevoIcon'
import { getLoteria } from '@/lib/loterias'

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

const APPS_URL = process.env.NEXT_PUBLIC_APPS_URL || ''

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
  // Config do bolão — sempre confirmada pela API antes de liberar a seleção
  const [VALOR_COTA, setValorCota]     = useState(0)
  const [TOTAL_COTAS, setTotalCotas]   = useState(Number(totalCotas) || 20)
  const [dezenas, setDezenas]          = useState(Number(dezenasProp)    || 6)
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
  const [relogio, setRelogio]             = useState('')
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

  // Comprovante self-service
  const [resultadoConf, setResultadoConf]     = useState<ResultadoConf | null>(null)
  const [modalPart, setModalPart]             = useState<Participante | null>(null)
  const [nomeVerif, setNomeVerif]             = useState('')
  const [verfErr, setVerfErr]                 = useState('')

  const concurso = concursoAtivo?.concurso

  function verificarIdentidade() {
    if (!modalPart) return
    const entrada    = nomeVerif.trim().toLowerCase()
    const cadastrado = modalPart.nome.trim().toLowerCase()
    if (entrada === cadastrado) {
      // Abre a mesma página de comprovantes do admin em modo público (sem auth)
      const url = `/comprovante?id=${modalPart.id}&pub=1`
        + (bolaoSlug ? `&bolao=${bolaoSlug}` : '')
        + (concurso  ? `&concurso=${concurso}` : '')
      window.open(url, '_blank')
      setModalPart(null)
      setNomeVerif('')
      setVerfErr('')
    } else {
      setVerfErr('❌ Nome não confere com o cadastro. Tente novamente.')
    }
  }

  // Relógio
  useEffect(() => {
    const tick = () => {
      const d = new Date(); const p = (n: number) => String(n).padStart(2, '0')
      setRelogio(`📅 ${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}  ·  ⏱ ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // ── INIT: busca tudo em paralelo, sem corrida de dados ──────────
  useEffect(() => {
    setConfigOk(false)

    const concursoFetch = loteriaCfg.id !== 'mega'
      ? fetch(`/api/resultados/${loteriaCfg.apiSlug}`).then(r => r.json()).then(d => {
          if (!d?.numero) return null
          const val = d.valorEstimadoProximoConcurso
          return {
            concurso: String((d.numero || 0) + 1),
            data: d.dataProximoConcurso || '',
            premio: val ? `R$ ${(val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi` : 'Acumulando',
          }
        }).catch(() => null)
      : fetch('/api/concurso-ativo').then(r => r.json())

    Promise.all([
      concursoFetch,
      fetch('/api/boloes').then(r => r.json()),
    ]).then(([ca, d]) => {
      // 1. Concurso
      if (ca) setConcursoAtivo(ca)
      const num = String(ca?.concurso || '')

      // 2. Config do bolão
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

      // 3. Cotas e participantes — usa concurso já confirmado (sem depender de state)
      if (num) {
        Promise.all([
          fetch(`/api/cotas?concurso=${num}&bolao=${bolaoSlug}`).then(r => r.json()),
          fetch(`/api/participantes?concurso=${num}&bolao=${bolaoSlug}`).then(r => r.json()),
        ]).then(([c, p]) => {
          setCotasOcupadas(c.cotas || [])
          setParticipantes(p.participantes || [])
          setConfigOk(true)
        })
      } else {
        setConfigOk(true)
      }
    }).catch(() => setConfigOk(false))
  }, [bolaoSlug, bolaoNomeProp])

  // Revalida config ao focar a aba e a cada 60s
  useEffect(() => {
    const atualizar = () => {
      const caFetch = loteriaCfg.id !== 'mega'
        ? fetch(`/api/resultados/${loteriaCfg.apiSlug}`).then(r => r.json()).then(d => {
            if (!d?.numero) return null
            const val = d.valorEstimadoProximoConcurso
            return {
              concurso: String((d.numero || 0) + 1),
              data: d.dataProximoConcurso || '',
              premio: val ? `R$ ${(val / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi` : 'Acumulando',
            }
          }).catch(() => null)
        : fetch('/api/concurso-ativo').then(r => r.json())
      Promise.all([
        fetch('/api/boloes').then(r => r.json()),
        caFetch,
      ]).then(([d, ca]) => {
        if (ca) setConcursoAtivo(ca)
        const b = (d.boloes || []).find((x: { slug: string }) => x.slug === bolaoSlug)
        if (!b) return
        setValorCota(Number(b.valor_cota) || 0)
        setTotalCotas(Number(b.total_cotas) || 20)
        setDezenas(Number(b.dezenas) || 6)
        setNumApostas(Number(b.num_apostas) || 1)
        setBolaoNome(b.nome || bolaoNomeProp)
        setEncerrado(!!b.encerrado)
        setResultadoConf(b.resultado_conferencia || null)
        setApostasData(b.apostas_data || null)
      }).catch(() => {})
    }
    window.addEventListener('focus', atualizar)
    const intervalo = setInterval(atualizar, 60000)
    return () => { window.removeEventListener('focus', atualizar); clearInterval(intervalo) }
  }, [bolaoSlug, bolaoNomeProp])

  // Countdown — usa hora do campo data se vier no formato "DD/MM · Dia · HHhMM", senão 20h00
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
    setCotasOcupadas(c.cotas || [])
    setParticipantes(p.participantes || [])
  }, [concursoAtivo?.concurso, bolaoSlug])

  useEffect(() => {
    if (!concursoAtivo?.concurso) return
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(recarregar, 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [recarregar, concursoAtivo?.concurso])



  async function confirmar() {
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
        body: JSON.stringify({ concurso: parseInt(concurso), nome: nome.trim().toUpperCase(), telefone: '55' + telefone.replace(/\D/g,''), email: email.trim().toLowerCase() || null, cotas: selecionadas.sort(), total, mp_payment_id: pixRes.paymentId, pix_code: pixRes.pixCode, bolao_slug: bolaoSlug }),
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

  async function copiarPix() {
    if (!pix) return
    await navigator.clipboard.writeText(pix.pixCode)
    alert('✅ Código PIX copiado!')
  }

  const todasCotas = Array.from({ length: TOTAL_COTAS }, (_, i) => String(i + 1).padStart(2, '0'))
  const disponiveisList = todasCotas.filter(c => !cotasOcupadas.includes(c))
  const selecionadas = disponiveisList.slice(0, Math.min(qtdCotas, disponiveisList.length))
  const total = selecionadas.length * VALOR_COTA
  const disp  = TOTAL_COTAS - cotasOcupadas.length

  return (
    <>
      <div className="page-wrap">
        <div className="site-header">
          <a href="/" className="header-link" title="Voltar">
            <span className="material-icons-round">arrow_back</span>
          </a>
          <div className="header-brand">
            <span className="brand">{loteriaLabel.toUpperCase()}</span>
          </div>
          <a href="/admin" className="header-link"><span className="material-icons-round">settings</span></a>
        </div>

        <div className="bolao-tag">{bolaoNome}</div>

        {concursoAtivo?.concurso && (
          <div className="mega-card">
            <div className="mega-header">
              <TrevoIcon size={24} loteria={loteria ?? 'mega'} />
              <span className="mega-title">{loteriaLabel.toUpperCase()}</span>
              <span className="mega-concurso">Concurso #{concursoAtivo.concurso}</span>
            </div>
            <div className="mega-body">
              {concursoAtivo.premio ? <div className="mega-prize">{concursoAtivo.premio}</div> : <div className="mega-prize">—</div>}
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
              <div className="mega-divider" />
              <div className="mega-stats">
                <div className="mega-stat"><div className="mega-stat-val">{disp}/{TOTAL_COTAS}</div><div className="mega-stat-lbl">Cotas Livres</div></div>
                <div className="mega-stat-sep" />
                <div className="mega-stat"><div className="mega-stat-val">{participantes.length}</div><div className="mega-stat-lbl">Participantes</div></div>
                <div className="mega-stat-sep" />
                <div className="mega-stat"><div className="mega-stat-val">{numApostas}</div><div className="mega-stat-lbl">Apostas</div></div>
                <div className="mega-stat-sep" />
                <div className="mega-stat"><div className="mega-stat-val">{dezenas}</div><div className="mega-stat-lbl">Dezenas</div></div>
              </div>
            </div>
          </div>
        )}

        {/* ── Apostas do bolão ── */}
        {apostasData?.bets && apostasData.bets.length > 0 && (
          <div className="mega-card">
            <div className="mega-header">
              <TrevoIcon size={24} loteria={loteria ?? 'mega'} />
              <span className="mega-title">{loteriaLabel.toUpperCase()}</span>
              <span className="mega-concurso">{apostasData.bets.length} apostas · {apostasData.bets[0]?.length} dezenas</span>
            </div>
            <div className="apostas-lista">
              {apostasData.bets.map((aposta, i) => (
                <div key={i} className="aposta-row">
                  <span className="aposta-idx">{i + 1}</span>
                  <div className="aposta-bolas">
                    {aposta.map(n => (
                      <span key={n} className="aposta-bola">{String(n).padStart(2, '0')}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {encerrado && (
          <div className="card">
            <div className="form-body">
              <div className="bolao-encerrado-banner">
                <div className="enc-icon">⛔</div>
                <div className="enc-title">Bolão Encerrado</div>
                <div className="enc-sub">
                  Este bolão foi encerrado pelo administrador.<br/>
                  Se você é participante, verifique seu <strong>WhatsApp</strong> para o PIX de complemento de pagamento.
                </div>
              </div>
            </div>
          </div>
        )}

        {!encerrado && <div className="card">
          <div className="form-body">
            <div className="field">
              <label className="field-label">Nome completo *</label>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value.toUpperCase())}
                placeholder="SEU NOME COMPLETO"
                className="input-upper"
              />
            </div>
            <div className="field">
              <label className="field-label">Celular com DDD (WhatsApp) *</label>
              <input
                type="tel"
                value={telefone}
                onChange={e => {
                  const v = e.target.value.replace(/\D/g,'').slice(0,11)
                  const f = v.length <= 2 ? v
                    : v.length <= 7  ? `(${v.slice(0,2)}) ${v.slice(2)}`
                    : `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
                  setTelefone(f)
                }}
                placeholder="(19) 99999-9999"
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label className="field-label">E-mail (opcional — para receber comprovante)</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>
            <hr />
            <div className="sec-title">🎟️ Selecionar Cotas</div>
            {!configOk && (
              <div className="bolao-nao-config">⏳ Carregando configuração...</div>
            )}
            {configOk && VALOR_COTA === 0 && (
              <div className="bolao-nao-config">
                ⚠️ Bolão aguardando configuração do administrador.
              </div>
            )}
            {configOk && VALOR_COTA > 0 && (
              <>
                <div className="cotas-progress-wrap">
                  <div className="cotas-progress-info">
                    <span className="cotas-progress-label">Cotas vendidas</span>
                    <span className="cotas-progress-nums"><strong>{cotasOcupadas.length}</strong>/{TOTAL_COTAS}</span>
                  </div>
                  <div className="cotas-progress-bar">
                    <div className="cotas-progress-fill" style={{ width: `${Math.round((cotasOcupadas.length / TOTAL_COTAS) * 100)}%` }} />
                  </div>
                  {disp <= 2 && disp > 0 && <div className="cotas-progress-urgente">⚡ Últimas {disp} cota{disp !== 1 ? 's' : ''}!</div>}
                </div>
                <div className="qtd-cotas-wrap">
                  <div>
                    <label className="qtd-cotas-label" htmlFor="qtd-cotas">Quantidade de cotas</label>
                    <div className="qtd-cota-preco">R$ {VALOR_COTA.toFixed(2).replace('.', ',')} / cota</div>
                  </div>
                  <div className="qtd-cotas-row">
                    <button type="button" className="qtd-btn" onClick={() => setQtdCotas(q => Math.max(1, q - 1))} aria-label="Diminuir">−</button>
                    <input
                      id="qtd-cotas"
                      type="number"
                      min={1}
                      max={disp}
                      value={qtdCotas}
                      onChange={e => setQtdCotas(Math.min(disp, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="qtd-input"
                    />
                    <button type="button" className="qtd-btn" onClick={() => setQtdCotas(q => Math.min(disp, q + 1))} aria-label="Aumentar">+</button>
                  </div>
                </div>
                <div className="total-bar">
                  <div><div className="t-label">Total a pagar</div><div className="t-cotas">{selecionadas.length} cota{selecionadas.length !== 1 ? 's' : ''}</div></div>
                  <div className="t-value">R$ {total.toFixed(2).replace('.', ',')}</div>
                </div>
                <button type="button" className="btn"
                  onClick={() => { if (!selecionadas.length) { alert('⚠️ Selecione ao menos uma cota!'); return } setAceitouTermos(false); setShowTermos(true) }}
                  disabled={enviando || !selecionadas.length}>
                  Ir para Pagamento
                </button>
              </>
            )}
            {participantes.length > 0 && (
              <>
                <hr />
                <div className="sec-title">👥 Participantes</div>

                {/* Status do sorteio */}
                {resultadoConf && (
                  <div className="sorteio-resultado-wrap">
                    <div className={`status-sorteio status-${resultadoConf.status}`}>
                      {resultadoConf.status === 'nao_apurado'         && `⏳ Sorteio não apurado${resultadoConf.data_sorteio ? ` — ${resultadoConf.data_sorteio}` : ''}`}
                      {resultadoConf.status === 'aguardando_apuracao'  && `🎲 Aguardando apuração — resultado após 22h`}
                      {resultadoConf.status === 'apurando'             && '🔄 Apuração em andamento...'}
                      {resultadoConf.status === 'nao_premiada'         && '😔 Não premiada neste concurso'}
                      {resultadoConf.status === 'ganhamos'             && `🏆 GANHAMOS! — ${resultadoConf.maior_premio}`}
                    </div>
                    {resultadoConf.dezenas_sorteadas && resultadoConf.dezenas_sorteadas.length === 6 && (
                      <div className="sorteio-dezenas">
                        <span className="sorteio-dezenas-label">Dezenas sorteadas</span>
                        <div className="sorteio-dezenas-grid">
                          {resultadoConf.dezenas_sorteadas.map(n => (
                            <span key={n} className="sorteio-dez-ball">{String(n).padStart(2, '0')}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-box">
                  {participantes.map(p => (
                    <div className="p-row" key={p.id}>
                      <span className="p-nome">{mascaraNome(p.nome)}</span>
                      <span className="p-cotas">{Array.isArray(p.cotas) ? p.cotas.join(', ') : p.cotas}</span>
                      {p.status === 'pago' ? (
                        <button
                          type="button"
                          className="p-pago"
                          onClick={() => { setModalPart(p); setNomeVerif(''); setVerfErr('') }}
                          title="Clique para ver seu comprovante"
                        >✅ PAGO</button>
                      ) : (
                        <span className="p-pending">⏳</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="footer"><strong>Boa sorte! 🍀</strong><br />Dúvidas? Fale com o administrador.</div>
          </div>
        </div>}
      </div>

      {/* Modal de Termos */}
      {showTermos && !pix && (
        <div className="pay-overlay">
          <div className="pay-box termos-box">
            <div className="termos-header">
              <div className="termos-titulo">📋 Termos de Participação</div>
              <div className="termos-bolao">{bolaoNome}</div>
            </div>

            <div className="termos-resumo">
              <div className="termos-linha"><span className="termos-ic">🎟️</span><span>Cotas selecionadas: <strong>{selecionadas.sort().join(', ')}</strong></span></div>
              <div className="termos-linha"><span className="termos-ic">💰</span><span>Total a pagar: <strong>R$ {total.toFixed(2).replace('.', ',')}</strong></span></div>
              <div className="termos-linha"><span className="termos-ic">🎲</span><span>Apostas: <strong>{numApostas}</strong> de <strong>{dezenas}</strong> dezenas</span></div>
            </div>

            <div className="termos-lista">
              {regras.map((r, i) => (
                <div key={i} className="termos-regra">
                  <div className="termos-regra-titulo">{r.icon} {r.titulo}</div>
                  <div className="termos-regra-desc">{r.texto}</div>
                </div>
              ))}
            </div>

            <label className="termos-check-label">
              <input type="checkbox" className="termos-check"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)} />
              <span>Li e concordo com as regras de participação deste bolão</span>
            </label>

            <button type="button" className={`btn ${!aceitouTermos ? 'btn-disabled' : ''}`}
              onClick={() => { if (aceitouTermos) { setShowTermos(false); confirmar() } }}
              disabled={!aceitouTermos || enviando}>
              {enviando ? '⏳ Gerando PIX...' : '✅ Confirmar e Gerar PIX'}
            </button>
            <button type="button" className="pay-fechar" onClick={() => setShowTermos(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {pix && (
        <div className="pay-overlay">
          <div className="pay-box">
            <div className="pay-stepper">
              {['Aguardando\nPagamento Pix','Em\nProcessamento','Pagamento\nConfirmado'].map((label, i) => (
                <div key={i} className="pay-step-wrap">
                  {i > 0 && <div className={`pay-line${payStep >= i ? ' done' : ''}`} />}
                  <div className="pay-step-item" key={`item-${i}`}>
                    <div className={`pay-dot${payStep >= i ? ' active' : ''}${payStep === i ? ' current' : ''}`}>{payStep > i ? '✓' : payStep === i ? '◆' : ''}</div>
                    {payStep === i && <div className="pay-step-label">{label.split('\n').map((l,k) => <span key={k}>{l}<br/></span>)}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="receipt-card">
              <div className="receipt-pix-row"><span className="receipt-meio">Meio de pagamento:</span><span className="pix-logo">◈ pix</span></div>
              <div className="receipt-grid">
                <div><span className="receipt-lbl">Bolão: </span><span className="receipt-val">{bolaoNome}</span></div>
                <div><span className="receipt-lbl">ID: </span><span className="receipt-val">{pix.paymentId.substring(0,16)}</span></div>
                <div><span className="receipt-lbl">Situação: </span><span className={`receipt-situacao${payStatus === 'pago' ? ' pago' : ''}`}>{payStatus === 'pago' ? 'Confirmado' : 'Em Processamento'}</span></div>
                <div><span className="receipt-lbl">Data: </span><span className="receipt-val">{payCreated}</span></div>
              </div>
            </div>
            {payStatus !== 'pago' && (<>
              <div className="pay-scan-title">Escaneie o código a seguir</div>
              <img className="pay-qr" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" />
              <div className="pay-copy-title">Ou copie este código para efetuar o pagamento</div>
              <div className="pay-instruction">No seu internet Banking ou app escolha pagamento via pix. Depois copie e cole o seguinte código</div>
              <div className="pay-code-row">
                <div className="pay-code">{pix.pixCode}</div>
                <button type="button" className="pay-copy-btn" onClick={copiarPix}>📋 Copiar código</button>
              </div>
              {payTimer && <div className="pay-timer">⊙ Você tem <strong>{payTimer} minutos</strong> para efetuar o pagamento</div>}
            </>)}
            {payStatus === 'pago' && (
              <div className="comprovante">
                {/* Header */}
                <div className="comp-header">
                  <span className="comp-check-icon">✅</span>
                  <div className="comp-titulo">Comprovante de Participação</div>
                  <div className="comp-data">{payCreated}</div>
                </div>

                {/* Valor */}
                <div className="comp-valor">R$ {pix.total.toFixed(2).replace('.', ',')}</div>

                {/* Timeline De → Para */}
                <div className="comp-timeline">
                  <div className="comp-timeline-col">
                    <div className="comp-dot comp-dot-blue" />
                    <div className="comp-vline" />
                    <div className="comp-dot comp-dot-blue" />
                  </div>
                  <div className="comp-timeline-info">
                    <div className="comp-party">
                      <div className="comp-party-label">De</div>
                      <div className="comp-party-nome">{pix.nome}</div>
                      <div className="comp-party-detalhe">Cotas adquiridas: {pix.cotas.join(', ')}</div>
                    </div>
                    <div className="comp-party comp-party-second">
                      <div className="comp-party-label">Para</div>
                      <div className="comp-party-nome">{bolaoNome}</div>
                      <div className="comp-party-detalhe">Administrador do Bolão</div>
                      <div className="comp-party-detalhe">{numApostas} apostas · {dezenas} dezenas</div>
                    </div>
                  </div>
                </div>

                {/* IDs da transação */}
                <div className="comp-ids">
                  <div className="comp-id-row">
                    <span className="comp-id-lbl">ID da transação</span>
                    <span className="comp-id-val">{pix.paymentId}</span>
                  </div>
                  {pix.fonte === 'mp' && (
                    <div className="comp-id-row">
                      <span className="comp-id-lbl">Mercado Pago</span>
                      <span className="comp-id-val">{pix.paymentId}</span>
                    </div>
                  )}
                </div>

                {/* Termos aceitos */}
                <div className="comp-termos-aceitos">
                  <div className="comp-termos-titulo">📋 Termos de Participação Aceitos</div>
                  {regras.map((r, i) => (
                    <div key={i} className="comp-termos-item">
                      <span>{r.icon}</span>
                      <span><strong>{r.titulo}:</strong> {r.texto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button type="button" className="pay-fechar" onClick={() => { setPix(null); if(timerRef.current) clearInterval(timerRef.current); if(statusRef.current) clearInterval(statusRef.current) }}>Fechar</button>
          </div>
        </div>
      )}
      {/* ── Modal de verificação de identidade ── */}
      {modalPart && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setModalPart(null) }}>
          <div className="modal-box">
            <div className="modal-title">🔒 Verificar identidade</div>
            <p className="modal-desc">Digite seu <strong>nome completo</strong> conforme cadastrado para visualizar seu comprovante.</p>
            <input
              type="text"
              className="modal-input"
              placeholder="Seu nome completo"
              value={nomeVerif}
              autoFocus
              onChange={e => { setNomeVerif(e.target.value); setVerfErr('') }}
              onKeyDown={e => { if (e.key === 'Enter') verificarIdentidade() }}
            />
            {verfErr && <div className="modal-err">{verfErr}</div>}
            <div className="modal-actions">
              <button type="button" className="modal-btn-cancel" onClick={() => setModalPart(null)}>Cancelar</button>
              <button type="button" className="modal-btn-confirm" onClick={verificarIdentidade}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}
