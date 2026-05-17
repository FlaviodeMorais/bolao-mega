import { NextRequest, NextResponse } from 'next/server'
import { verificarToken, alterarSenha } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { senhaAtual, novaSenha } = await req.json()
  const result = await alterarSenha(senhaAtual, novaSenha)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
