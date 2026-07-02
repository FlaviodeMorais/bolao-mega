import { NextResponse } from 'next/server'
import { getWhatsappSettings } from '@/lib/settings'

const WHAPI_URL = 'https://gate.whapi.cloud'

export async function GET() {
  const { token } = await getWhatsappSettings()
  if (!token) {
    return NextResponse.json({ connected: false, msg: 'Token do WhatsApp não configurado' })
  }
  try {
    const res  = await fetch(`${WHAPI_URL}/health`, {
      headers: { 'Authorization': `Bearer ${token}` },
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
