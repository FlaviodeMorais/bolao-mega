import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { getAllSettings, salvarSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const settings = await getAllSettings()
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { namespace, dados } = await req.json()
  if (!namespace || !dados) return NextResponse.json({ error: 'namespace e dados são obrigatórios' }, { status: 400 })

  const namespaces = ['app', 'pagamento', 'whatsapp', 'email', 'paginas.home', 'paginas.bolao', 'paginas.esporte']
  if (!namespaces.includes(namespace)) return NextResponse.json({ error: 'namespace inválido' }, { status: 400 })

  const result = await salvarSettings(namespace, dados)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ ok: true })
}
