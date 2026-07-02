import { NextRequest, NextResponse } from 'next/server'
import { verificarSenha, gerarToken, verificarToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  const ok = !!token && (await verificarToken(token))
  return NextResponse.json({ ok })
}

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
