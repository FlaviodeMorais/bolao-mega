import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { gerarTokenUsuario, verificarSenhaUsuario } from '@/lib/auth-usuario'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()
  if (!email || !senha) return NextResponse.json({ error: 'E-mail e senha obrigatórios' }, { status: 400 })

  const emailNorm = String(email).toLowerCase().trim()
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, senha_hash')
    .eq('email', emailNorm)
    .single()

  if (!usuario) return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })

  const ok = await verificarSenhaUsuario(senha, usuario.senha_hash)
  if (!ok) return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 })

  const token = await gerarTokenUsuario(usuario.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('user_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
