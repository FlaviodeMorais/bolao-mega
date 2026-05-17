import { NextResponse } from 'next/server'

const WHAPI_URL   = 'https://gate.whapi.cloud'
const WHAPI_TOKEN = process.env.WHAPI_TOKEN || ''

export async function GET() {
  if (!WHAPI_TOKEN) return NextResponse.json({ connected: false, erro: 'Token não configurado' })
  try {
    const res  = await fetch(`${WHAPI_URL}/health`, {
      headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` },
    })
    const data = await res.json()
    return NextResponse.json({
      connected: res.ok && data.status?.toLowerCase() !== 'offline',
      status:    data.status || 'unknown',
      phone:     data.phone_id || null,
    })
  } catch (err) {
    return NextResponse.json({ connected: false, erro: String(err) })
  }
}
