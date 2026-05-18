import { NextResponse } from 'next/server'

const WHAPI_URL   = 'https://gate.whapi.cloud'
const WHAPI_TOKEN = process.env.WHAPI_TOKEN || ''

export async function GET() {
  if (!WHAPI_TOKEN) {
    return NextResponse.json({ connected: false, msg: 'WHAPI_TOKEN não configurado no Vercel' })
  }
  try {
    const res  = await fetch(`${WHAPI_URL}/health`, {
      headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))

    // "Service not found" = canal inicializando após reconexão
    if (data.error === 'Service not found') {
      return NextResponse.json({ connected: false, msg: 'Canal inicializando. Aguarde 2-3 min após reconectar.' })
    }

    const status = (data.status || '').toLowerCase()
    const connected = res.ok && status !== 'offline' && !data.error

    return NextResponse.json({
      connected,
      status: data.status || (res.ok ? 'online' : 'error'),
      msg: connected
        ? `WhatsApp conectado`
        : `Desconectado (${data.error || data.status || res.status})`,
    })
  } catch (err) {
    return NextResponse.json({ connected: false, msg: `Erro de rede: ${String(err)}` })
  }
}
