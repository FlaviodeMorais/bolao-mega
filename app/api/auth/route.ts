import { NextRequest, NextResponse } from 'next/server'
import { verificarSenha, gerarToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { senha } = await req.json()
  const ok = await verificarSenha(senha)
  if (!ok) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 })

  const token = await gerarToken()
  const res   = NextResponse.json({ ok: true })
  res.cookies.set('admin_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    maxAge:   60 * 60 * 8,
    path:     '/',
  })
  return res
}
