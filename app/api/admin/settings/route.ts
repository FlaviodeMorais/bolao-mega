import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { getAllSettings, salvarSettings } from '@/lib/settings'

async function auth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token && await verificarToken(token)
}

export async function GET(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const all = await getAllSettings()
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { namespace, dados } = await req.json()
  if (!namespace || dados === undefined) {
    return NextResponse.json({ error: 'namespace e dados são obrigatórios' }, { status: 400 })
  }
  const result = await salvarSettings(namespace, dados)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
