'use client'
import { useEffect, useState, useCallback, useRef } from 'react'

const TOTAL_COTAS = 20
const VALOR_COTA  = 30

interface Participante {
  id: string; nome: string; cotas: string[]; total: number; status: string
}
interface ConcursoAtivo { concurso: string; data: string; premio: string }
interface PixData { pixCode: string; qrCodeBase64: string; paymentId: string; fonte: string; nome: string; cotas: string[]; total: number }

export default function Home() {
  const [nome, setNome]           = useState('')
  const [cotasOcupadas, setCotasOcupadas]  = useState<string[]>([])
  const [selecionadas, setSelecionadas]    = useState<string[]>([])
  const [participantes, setParticipantes]  = useState<Participante[]>([])
  const [concursoAtivo, setConcursoAtivo]  = useState<ConcursoAtivo | null>(null)
  const [pix, setPix]             = useState<PixData | null>(null)
  const [enviando, setEnviando]   = useState(false)
  const [relogio, setRelogio]     = useState('')
  const [countdown, setCountdown] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const concurso = concursoAtivo?.concurso

  // Relógio
  useEffect(() => {
    const tick = () => {
      const d = new Date()
      const p = (n: number) => String(n).padStart(2, '0')
      setRelogio(`📅 ${p(d.getDate())}/${p(d.getMonth()+1)}/${d.getFullYear()}  ·  ⏱ ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  // Carrega concurso ativo
  useEffect(() => {
    fetch('/api/concurso-ativo').then(r => r.json()).then(setConcursoAtivo)
  }, [])

  // Countdown até o sorteio
  useEffect(() => {
    if (!concursoAtivo?.data) return
    const datePart = concursoAtivo.data.split(' ·')[0]
    const [dd, mm] = datePart.split('/').map(Number)
    const year = new Date().getFullYear()
    const draw = new Date(year, mm - 1, dd, 21, 0, 0)
    const tick = () => {
      const diff = draw.getTime() - Date.now()
      if (diff <= 0) { setCountdown('Apostas encerradas'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setCountdown(`${h}h ${m}min`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [concursoAtivo?.data])

  // Poll de cotas e participantes a cada 10s
  const recarregar = useCallback(async () => {
    if (!concurso) return
    const [c, p] = await Promise.all([
      fetch(`/api/cotas?concurso=${concurso}`).then(r => r.json()),
      fetch(`/api/participantes?concurso=${concurso}`).then(r => r.json()),
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
    setSelecionadas(prev =>
      prev.includes(num) ? prev.filter(c => c !== num) : [...prev, num]
    )
  }

  async function confirmar() {
    if (!nome.trim())         { alert('⚠️ Informe seu nome!'); return }
    if (!concurso)            { alert('⚠️ Nenhum concurso ativo. Aguarde o admin.'); return }
    if (!selecionadas.length) { alert('⚠️ Selecione ao menos uma cota!'); return }

    setEnviando(true)
    try {
      const total = selecionadas.length * VALOR_COTA

      // Gera PIX
      const pixRes = await fetch('/api/pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concurso: parseInt(concurso), nome: nome.trim(), cotas: selecionadas.sort(), total }),
      }).then(r => r.json())

      // Registra participante
      const reg = await fetch('/api/participantes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concurso: parseInt(concurso),
          nome: nome.trim(),
          cotas: selecionadas.sort(),
          total,
          mp_payment_id: pixRes.paymentId,
          pix_code: pixRes.pixCode,
        }),
      }).then(r => r.json())

      if (reg.error) { alert('⚠️ ' + reg.error); return }

      const cotasSalvas = [...selecionadas].sort()
      const nomeSalvo   = nome.trim()
      const totalSalvo  = cotasSalvas.length * VALOR_COTA
      setPix({ ...pixRes, nome: nomeSalvo, cotas: cotasSalvas, total: totalSalvo })
      setNome('')
      setSelecionadas([])
      recarregar()
    } finally {
      setEnviando(false)
    }
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
      <div className="card">
        <div className="header">
          <div className="patch">🎖️</div>
          <h1>GRUPO MEGA 💯</h1>
          <div className="sub">OPERAÇÃO MEGA-SENA · SETOR ESPECIAL</div>
          <div className="classified">⚠ GRUPO FECHADO ⚠</div>
        </div>

        <div className="stats">
          <div className="stat"><div className="s-label">Apostas</div><div className="s-val">100</div></div>
          <div className="sep" />
          <div className="stat"><div className="s-label">Cotas</div><div className="s-val">20</div></div>
          <div className="sep" />
          <div className="stat"><div className="s-label">Por Cota</div><div className="s-val">R$ 30</div></div>
        </div>

        <div className="rules-box">
          <div className="rules-title">🚨 DIRETIVAS DO GRUPO</div>
          <div className="rule"><span className="ico">🎯</span><span><strong>100 apostas</strong> por concurso · <strong>20 cotas</strong> de <strong>R$ 30,00</strong> cada.</span></div>
          <div className="rule"><span className="ico">📅</span><span><strong>3 sorteios por semana.</strong> Grupo fechado para membros confirmados.</span></div>
          <div className="rule"><span className="ico">⏰</span><span>Pagamento até as <strong>12:00 da data do concurso.</strong></span></div>
          <div className="rule"><span className="ico">🔄</span><span>Cotas não pagas serão redistribuídas ou adquiridas por outro membro.</span></div>
          <div className="rule"><span className="ico">🚫</span><span>Membro que <strong>não participar das rodadas</strong> será <strong>eliminado [BAN].</strong></span></div>
        </div>

        <div className="form-body">
          {concursoAtivo?.concurso && (
            <div className="mega-card">
              <div className="mega-header">
                <span className="mega-clover">🍀</span>
                <span className="mega-title">mega-sena</span>
                <span className="mega-concurso">Concurso #{concursoAtivo.concurso}</span>
              </div>
              <div className="mega-body">
                {concursoAtivo.premio && (
                  <div className="mega-prize">{concursoAtivo.premio}</div>
                )}
                <div className="mega-prize-label">Prêmio estimado do concurso #{concursoAtivo.concurso}</div>
                {concursoAtivo.data && (
                  <>
                    <div className="mega-draw-label">Sorteio</div>
                    <div className="mega-draw-date">{concursoAtivo.data} às 21h00</div>
                  </>
                )}
                {countdown && (
                  <div className="mega-countdown">⏱ Apostas se encerram em {countdown}</div>
                )}
                <div className="mega-divider" />
                <div className="mega-stats">
                  <div className="mega-stat">
                    <div className="mega-stat-val">{disp}/20</div>
                    <div className="mega-stat-lbl">Cotas Livres</div>
                  </div>
                  <div className="mega-stat-sep" />
                  <div className="mega-stat">
                    <div className="mega-stat-val">{participantes.length}</div>
                    <div className="mega-stat-lbl">Participantes</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="sec-title">📋 IDENTIFICAÇÃO DO AGENTE</div>

          <div className="field">
            <label className="field-label">// Nome completo *</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="NOME COMPLETO" />
          </div>

          <div className="field">
            <label className="field-label">// Data / Hora do registro</label>
            <div className="datetime-box">{relogio}</div>
          </div>

          <hr />
          <div className="sec-title">🎟️ SELECIONAR COTAS</div>
          <div className="disponivel-bar">DISPONÍVEIS: <span>{disp}</span>/20</div>

          <div className="cotas-grid">
            {Array.from({ length: TOTAL_COTAS }, (_, i) => {
              const num = String(i + 1).padStart(2, '0')
              const ocupada   = cotasOcupadas.includes(num)
              const ativa     = selecionadas.includes(num)
              return (
                <div
                  key={num}
                  className={`cota${ativa ? ' ativo' : ''}${ocupada ? ' ocupada' : ''}`}
                  onClick={() => toggleCota(num)}
                >
                  <span className="c-num">{num}</span>
                  <span className="c-lbl">{ocupada ? 'OCUPADA' : 'COTA'}</span>
                </div>
              )
            })}
          </div>

          <div className="total-bar">
            <div>
              <div className="t-label">// Total a pagar</div>
              <div className="t-cotas">{selecionadas.length} cota{selecionadas.length !== 1 ? 's' : ''} selecionada{selecionadas.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="t-value">R$ {total.toFixed(2).replace('.', ',')}</div>
          </div>

          <div className="pix-card">
            <span className="pix-icon">💳</span>
            <div>
              <div className="pi-label">// Chave Pix (CPF)</div>
              <div className="pi-chave">272.105.928-90</div>
              <div className="pi-prazo">⏰ PRAZO: 12:00 DA DATA DO CONCURSO</div>
            </div>
          </div>

          <button className="btn" onClick={confirmar} disabled={enviando}>
            {enviando ? '⏳ GERANDO PIX...' : '🍀 CONFIRMAR MISSÃO'}
          </button>

          {participantes.length > 0 && (
            <>
              <hr />
              <div className="sec-title">👥 PARTICIPANTES</div>
              <div className="p-box">
                {participantes.map(p => (
                  <div className="p-row" key={p.id}>
                    <span className="p-nome">{p.nome}</span>
                    <span className="p-cotas">{Array.isArray(p.cotas) ? p.cotas.join(', ') : p.cotas}</span>
                    <span className={p.status === 'pago' ? 'p-pago' : 'p-pending'}>
                      {p.status === 'pago' ? '✅ PAGO' : '⏳'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="footer">
            <strong>BOA SORTE A TODOS 🤞</strong><br />
            DÚVIDAS → FALE COM O ADMIN DO GRUPO
          </div>
        </div>
      </div>

      {pix && (
        <div className="modal-overlay ativo">
          <div className="modal-box">
            <div className="modal-titulo">🎟️ QR Code PIX Gerado</div>
            <div className="modal-nome">{pix.nome}</div>
            <div className="modal-cotas">Cotas: {pix.cotas.join(', ')}</div>
            <img className="modal-qr" src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" />
            <div className="modal-total">R$ {pix.total.toFixed(2).replace('.', ',')}</div>
            <div className="modal-pix-label">// Pix Copia e Cola</div>
            <div className="modal-pix-code">{pix.pixCode}</div>
            <button type="button" className="btn-copiar" onClick={copiarPix}>📋 COPIAR CÓDIGO PIX</button>
            <button type="button" className="btn-fechar" onClick={() => setPix(null)}>✖ FECHAR</button>
            <div className={`modal-aviso ${pix.fonte === 'mp' ? 'fonte-mp' : ''}`}>
              {pix.fonte === 'mp'
                ? '✅ Pagamento verificado automaticamente pelo Mercado Pago.'
                : '⏰ Pague até 12:00. Informe o comprovante ao admin após pagar.'}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
