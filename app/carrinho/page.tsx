'use client'
import { useState, useEffect, useRef } from 'react'
import { useCart, type CartItem } from '@/components/CartContext'
import UserAuthModal from '@/components/UserAuthModal'

interface PixData { pixCode: string; qrCodeBase64: string; paymentId: string; total: number }

function resumoItem(item: CartItem): string {
  if (item.tipo === 'loteria') return `${item.cotas.length} cota${item.cotas.length !== 1 ? 's' : ''} (Nº ${item.cotas.join(', ')}) — Concurso #${item.concurso}`
  return `${item.palpites.length} palpite${item.palpites.length !== 1 ? 's' : ''}`
}

export default function CarrinhoPage() {
  const cart = useCart()
  const [usuario, setUsuario] = useState<{ nome: string; email: string } | null>(null)
  const [checando, setChecando] = useState(true)
  const [userAuthAberto, setUserAuthAberto] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [pix, setPix] = useState<PixData | null>(null)
  const [payStatus, setPayStatus] = useState<'aguardando' | 'pago'>('aguardando')
  const [copiado, setCopiado] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetch('/api/usuario/me').then(r => r.json()).then(d => {
      setUsuario(d.usuario || null)
      setChecando(false)
    }).catch(() => setChecando(false))
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function finalizar() {
    if (!usuario) { setUserAuthAberto(true); return }
    setEnviando(true); setErro('')
    const res = await fetch('/api/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart.items }),
    }).then(r => r.json()).catch(() => ({ error: 'Erro de conexão' }))
    setEnviando(false)

    if (res.error) { setErro(res.error); return }
    setPix({ pixCode: res.pixCode, qrCodeBase64: res.qrCodeBase64, paymentId: res.paymentId, total: res.total })
    cart.clear()

    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      const st = await fetch(`/api/status?paymentId=${res.paymentId}`).then(r => r.json()).catch(() => null)
      if (st?.status === 'pago') { setPayStatus('pago'); clearInterval(pollRef.current!) }
    }, 5000)
  }

  function copiarPix() {
    if (!pix) return
    navigator.clipboard.writeText(pix.pixCode)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const wrapStyle: React.CSSProperties = {
    minHeight: '100svh', background: '#06090f',
    backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(0,171,103,.12), transparent 50%), radial-gradient(circle at 100% 100%, rgba(0,93,169,.08), transparent 50%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#fff',
    padding: '24px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center',
  }
  const cardStyle: React.CSSProperties = {
    width: '100%', maxWidth: 480,
    background: 'rgba(13,28,46,0.85)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20, padding: 24, marginBottom: 16,
    backdropFilter: 'blur(24px) saturate(160%)',
  }

  return (
    <div style={wrapStyle}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: 20 }}>←</a>
        <div style={{ fontSize: 20, fontWeight: 800 }}>🛒 Carrinho</div>
      </div>

      {userAuthAberto && (
        <UserAuthModal onClose={() => setUserAuthAberto(false)}
          onAutenticado={u => { setUsuario(u); setUserAuthAberto(false) }} />
      )}

      {!pix ? (
        <div style={cardStyle}>
          {checando ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 20 }}>Carregando...</div>
          ) : cart.items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 20 }}>
              Seu carrinho está vazio.<br />
              <a href="/" style={{ color: '#00AB67', textDecoration: 'underline' }}>Ver bolões disponíveis</a>
            </div>
          ) : (
            <>
              {cart.items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0', borderBottom: i < cart.items.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none',
                }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {item.tipo === 'loteria' ? '🍀' : '⚽'} {item.bolaoNome}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{resumoItem(item)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontWeight: 700, color: '#00AB67' }}>R$ {item.total.toFixed(2).replace('.', ',')}</div>
                    <button onClick={() => cart.removeItem(i)}
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', borderRadius: 8, width: 28, height: 28, cursor: 'pointer' }}
                      aria-label="Remover">✕</button>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0 4px', marginTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#00AB67' }}>R$ {cart.total.toFixed(2).replace('.', ',')}</span>
              </div>

              {erro && <div style={{ fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: 500 }}>❌ {erro}</div>}

              <button onClick={finalizar} disabled={enviando}
                style={{
                  width: '100%', padding: 15, marginTop: 16,
                  background: 'linear-gradient(135deg, #00AB67 0%, #009B63 100%)',
                  color: '#fff', border: 'none', borderRadius: 100,
                  fontSize: 15, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer',
                  opacity: enviando ? 0.7 : 1,
                }}>
                {enviando ? '⏳ Gerando PIX...' : (usuario ? '✅ Finalizar e Pagar' : '🔒 Entrar para finalizar')}
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={cardStyle}>
          {payStatus === 'pago' ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>Pagamento confirmado!</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                Total: R$ {pix.total.toFixed(2).replace('.', ',')}
              </div>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Escaneie o QR Code</div>
              <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 800, color: '#00AB67', marginBottom: 14 }}>
                R$ {pix.total.toFixed(2).replace('.', ',')}
              </div>
              {pix.qrCodeBase64 && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                  <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" style={{ width: 220, height: 220, borderRadius: 12, background: '#fff', padding: 8 }} />
                </div>
              )}
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Ou copie o código</div>
              <div style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: 12, fontSize: 11, wordBreak: 'break-all',
                fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', marginBottom: 12,
              }}>{pix.pixCode}</div>
              <button onClick={copiarPix} style={{
                width: '100%', padding: 12, marginBottom: 14,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', borderRadius: 100, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              }}>
                {copiado ? '✅ Copiado!' : '📋 Copiar código PIX'}
              </button>
              <div style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                ⏳ Aguardando confirmação do pagamento...
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
