import { NextResponse } from 'next/server'
import { getWhatsappSettings } from '@/lib/settings'

const WHAPI_URL = 'https://gate.whapi.cloud'
const ZAPSTER_URL = 'https://api.zapsterapi.com/v1'

export async function GET() {
  const cfg = await getWhatsappSettings()
  if (!cfg.token) {
    return NextResponse.json({ connected: false, msg: 'Token do WhatsApp não configurado' })
  }

  if (cfg.provider === 'zapster') {
    if (!cfg.zapster_instance_id) {
      return NextResponse.json({ connected: false, msg: 'Instance ID da Zapster não configurado' })
    }
    try {
      const res = await fetch(`${ZAPSTER_URL}/wa/instances/${cfg.zapster_instance_id}`, {
        headers: { 'Authorization': `Bearer ${cfg.token}` },
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      const status: string = data?.status || ''
      const connected = res.ok && status === 'connected'

      return NextResponse.json({
        connected,
        status: status || (res.ok ? 'unknown' : 'error'),
        msg: connected
          ? 'WhatsApp conectado (Zapster)'
          : status === 'disconnected'
            ? 'Aguardando escanear o QR code na instância'
            : `Desconectado (${status || res.status})`,
      })
    } catch (err) {
      return NextResponse.json({ connected: false, msg: `Erro de rede: ${String(err)}` })
    }
  }

  if (cfg.provider === 'evolution') {
    if (!cfg.evolution_url || !cfg.evolution_instance) {
      return NextResponse.json({ connected: false, msg: 'URL/instância do Evolution API não configurados' })
    }
    try {
      const res = await fetch(`${cfg.evolution_url}/instance/connectionState/${cfg.evolution_instance}`, {
        headers: { 'apikey': cfg.token },
        cache: 'no-store',
      })
      const data = await res.json().catch(() => ({}))
      const state: string = data?.instance?.state || ''
      const connected = res.ok && state === 'open'

      return NextResponse.json({
        connected,
        status: state || (res.ok ? 'unknown' : 'error'),
        msg: connected
          ? 'WhatsApp conectado (Evolution API)'
          : state === 'connecting'
            ? 'Conectando... aguarde escanear o QR code na instância'
            : `Desconectado (${state || res.status})`,
      })
    } catch (err) {
      return NextResponse.json({ connected: false, msg: `Erro de rede: ${String(err)}` })
    }
  }

  try {
    const res  = await fetch(`${WHAPI_URL}/health`, {
      headers: { 'Authorization': `Bearer ${cfg.token}` },
      cache: 'no-store',
    })
    const data = await res.json().catch(() => ({}))

    // "Service not found" = canal inicializando após reconexão
    if (data.error === 'Service not found') {
      return NextResponse.json({ connected: false, msg: 'Canal inicializando. Aguarde 2-3 min após reconectar.' })
    }

    // status vem como { code, text } (ex: { code: 3, text: 'QR' }), não string
    const statusText: string = typeof data.status === 'string' ? data.status : (data.status?.text || '')
    // "user" só vem preenchido quando o número está de fato vinculado (QR escaneado)
    const connected = res.ok && !data.error && !!data.user

    return NextResponse.json({
      connected,
      status: statusText || (res.ok ? 'online' : 'error'),
      msg: connected
        ? `WhatsApp conectado`
        : statusText.toUpperCase() === 'QR'
          ? 'Aguardando escanear o QR code no painel da Whapi'
          : `Desconectado (${data.error || statusText || res.status})`,
    })
  } catch (err) {
    return NextResponse.json({ connected: false, msg: `Erro de rede: ${String(err)}` })
  }
}
