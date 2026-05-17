'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

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

interface Participante { id: string; nome: string; cotas: string[]; total: number; status: string }
interface ConcursoAtivo { concurso: string; data: string; premio: string }
interface PixData { pixCode: string; qrCodeBase64: string; paymentId: string; fonte: string; nome: string; cotas: string[]; total: number }

interface Props {
  bolaoNome: string
  bolaoSlug: string
  valorCota: number
  totalCotas: number
  dezenas: number
  numApostas: number
  taxaAdmin: number
}

export default function BolaoForm({ bolaoNome, bolaoSlug, valorCota, totalCotas, dezenas, numApostas, taxaAdmin }: Props) {
  const VALOR_COTA  = Number(valorCota)  || 30
  const TOTAL_COTAS = Number(totalCotas) || 20

  const [nome, setNome]                   = useState('')
  const [telefone, setTelefone]           = useState('')
  const [cotasOcupadas, setCotasOcupadas] = useState<string[]>([])
  const [selecionadas, setSelecionadas]   = useState<string[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concursoAtivo, setConcursoAtivo] = useState<ConcursoAtivo | null>(null)
  const [pix, setPix]                     = useState<PixData | null>(null)
  const [enviando, setEnviando]           = useState(false)
  const [relogio, setRelogio]             = useState('')
  const [countdown, setCountdown]         = useState('')
  const [payTimer, setPayTimer]           = useState('')
  const [payStep, setPayStep]             = useState(0)
  const [payStatus, setPayStatus]         = useState<'aguardando'|'pago'|'unknown'>('aguardando')
  const [payCreated, setPayCreated]       = useState('')
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const statusRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const concurso = concursoAtivo?.concurso

  // Relógio
  useEffect(() => {
    const tick = () => {
      const d = new Date(); const p = (n: number) => String(n).padStart(2, '0')
      setRelogio(`📅 ${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}  ·  ⏱ ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])

  // Concurso ativo
  useEffect(() => { fetch('/api/concurso-ativo').then(r => r.json()).then(setConcursoAtivo) }, [])

  // Countdown — usa hora do campo data se vier no formato "DD/MM · Dia · HHhMM", senão 20h00
  useEffect(() => {
    if (!concursoAtivo?.data) return
    const dataPart = concursoAtivo.data.split(' · ')
    const [dd, mm] = dataPart[0].split('/').map(Number)
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
    if (!concurso) return
    const [c, p] = await Promise.all([
      fetch(`/api/cotas?concurso=${concurso}&bolao=${bolaoSlug}`).then(r => r.json()),
      fetch(`/api/participantes?concurso=${concurso}&bolao=${bolaoSlug}`).then(r => r.json()),
    ])
    setCotasOcupadas(c.cotas || [])
    setParticipantes(p.participantes || [])
    setSelecionadas(prev => prev.filter(s => !(c.cotas || []).includes(s)))
  }, [concurso])

  useEffect(() => {
    recarregar()
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(recarregar, 10000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [recarregar])

  function toggleCota(num: string) {
    if (cotasOcupadas.includes(num)) return
    setSelecionadas(prev => prev.includes(num) ? prev.filter(c => c !== num) : [...prev, num])
  }

  async function confirmar() {
    if (!nome.trim())            { alert('⚠️ Informe seu nome completo!'); return }
    if (telefone.replace(/\D/g,'').length < 11) { alert('⚠️ Informe seu WhatsApp com DDD (ex: 19 99999-9999)!'); return }
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
        body: JSON.stringify({ concurso: parseInt(concurso), nome: nome.trim().toUpperCase(), telefone: '55' + telefone.replace(/\D/g,''), cotas: selecionadas.sort(), total, mp_payment_id: pixRes.paymentId, pix_code: pixRes.pixCode, bolao_slug: bolaoSlug }),
      }).then(r => r.json())
      if (reg.error) { alert('⚠️ ' + reg.error); return }
      const cotasSalvas = [...selecionadas].sort()
      setPix({ ...pixRes, nome: nome.trim().toUpperCase(), cotas: cotasSalvas, total: cotasSalvas.length * VALOR_COTA })
      setNome(''); setTelefone(''); setSelecionadas([]); recarregar()
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
            <span className="brand">MEGA-SENA</span>
          </div>
          <a href="/admin" className="header-link"><span className="material-icons-round">settings</span></a>
        </div>

        <div className="bolao-tag">{bolaoNome}</div>

        {concursoAtivo?.concurso && (
          <div className="mega-card">
            <div className="mega-header">
              <span className="mega-clover">🍀</span>
              <span className="mega-title">MEGA-SENA</span>
              <span className="mega-concurso">Concurso #{concursoAtivo.concurso}</span>
            </div>
            <div className="mega-body">
              {concursoAtivo.premio ? <div className="mega-prize">{concursoAtivo.premio}</div> : <div className="mega-prize">—</div>}
              <div className="mega-prize-label">Prêmio estimado do concurso #{concursoAtivo.concurso}</div>
              {concursoAtivo.data && (<><div className="mega-draw-label">Sorteio</div><div className="mega-draw-date">{concursoAtivo.data}</div></>)}
              {countdown && <div className="mega-countdown">Apostas se encerram em <span>{countdown}</span></div>}
              <div className="mega-divider" />
              <div className="mega-stats">
                <div className="mega-stat"><div className="mega-stat-val">{disp}/{TOTAL_COTAS}</div><div className="mega-stat-lbl">Cotas Livres</div></div>
                <div className="mega-stat-sep" />
                <div className="mega-stat"><div className="mega-stat-val">{participantes.length}</div><div className="mega-stat-lbl">Participantes</div></div>
              </div>
              <div className="mega-divider" />
              <div className="mega-stats">
                <div className="mega-stat"><div className="mega-stat-val">{numApostas}</div><div className="mega-stat-lbl">Apostas</div></div>
                <div className="mega-stat-sep" />
                <div className="mega-stat"><div className="mega-stat-val">{dezenas}</div><div className="mega-stat-lbl">Dezenas / Aposta</div></div>
              </div>
            </div>
          </div>
        )}

        <div className="card">
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
              <label className="field-label">Data / Hora do registro</label>
              <div className="datetime-box">{relogio}</div>
            </div>
            <hr />
            <div className="sec-title">🎟️ Selecionar Cotas</div>
            <div className="disponivel-bar">Disponíveis: <span>{disp}/{TOTAL_COTAS}</span></div>
            <div className="cotas-grid">
              {Array.from({ length: TOTAL_COTAS }, (_, i) => {
                const num = String(i + 1).padStart(2, '0')
                return (
                  <div key={num} className={`cota${selecionadas.includes(num) ? ' ativo' : ''}${cotasOcupadas.includes(num) ? ' ocupada' : ''}`} onClick={() => toggleCota(num)}>
                    <span className="c-num">{num}</span>
                    <span className="c-lbl">{cotasOcupadas.includes(num) ? 'OCUPADA' : 'COTA'}</span>
                  </div>
                )
              })}
            </div>
            <div className="total-bar">
              <div><div className="t-label">Total a pagar</div><div className="t-cotas">{selecionadas.length} cota{selecionadas.length !== 1 ? 's' : ''}</div></div>
              <div className="t-value">R$ {total.toFixed(2).replace('.', ',')}</div>
            </div>
            <button type="button" className="btn" onClick={confirmar} disabled={enviando}>
              {enviando ? '⏳ Gerando pagamento...' : 'Ir para Pagamento'}
            </button>
            {participantes.length > 0 && (
              <>
                <hr />
                <div className="sec-title">👥 Participantes</div>
                <div className="p-box">
                  {participantes.map(p => (
                    <div className="p-row" key={p.id}>
                      <span className="p-nome">{mascaraNome(p.nome)}</span>
                      <span className="p-cotas">{Array.isArray(p.cotas) ? p.cotas.join(', ') : p.cotas}</span>
                      <span className={p.status === 'pago' ? 'p-pago' : 'p-pending'}>{p.status === 'pago' ? '✅ PAGO' : '⏳'}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            <div className="footer"><strong>Boa sorte! 🍀</strong><br />Dúvidas? Fale com o administrador.</div>
          </div>
        </div>
      </div>

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
              <div className="pay-confirmed">
                <div className="pay-confirmed-icon">✅</div>
                <div className="pay-confirmed-title">Pagamento Confirmado!</div>
                <div className="pay-confirmed-sub">{pix.nome} · Cotas: {pix.cotas.join(', ')} · R$ {pix.total.toFixed(2).replace('.', ',')}</div>
              </div>
            )}
            <button type="button" className="pay-fechar" onClick={() => { setPix(null); if(timerRef.current) clearInterval(timerRef.current); if(statusRef.current) clearInterval(statusRef.current) }}>Fechar</button>
          </div>
        </div>
      )}
    </>
  )
}
