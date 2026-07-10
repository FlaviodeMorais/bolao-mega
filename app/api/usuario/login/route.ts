import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { gerarTokenUsuario, verificarSenhaUsuario } from '@/lib/auth-usuario'

export async function POST(req: NextRequest) {
  const { identificador, email, senha } = await req.json()

  // Suporta campo legado 'email' ou novo 'identificador' (e-mail ou telefone)
  const id = (identificador || email || '').trim()
  if (!id || !senha) return NextResponse.json({ error: 'Identificador e senha obrigatórios' }, { status: 400 })

  const isEmail = id.includes('@')
  const telNorm = id.replace(/\D/g, '')

  let usuario: { id: string; senha_hash: string } | null = null

  if (isEmail) {
    const { data } = await supabase
      .from('usuarios')
      .select('id, senha_hash')
      .eq('email', id.toLowerCase())
      .single()
    usuario = data
  } else {
    // Tenta por telefone (com ou sem DDI 55)
    const variants = [telNorm, telNorm.replace(/^55/, ''), `55${telNorm}`].filter(Boolean)
    for (const v of variants) {
      const { data } = await supabase
        .from('usuarios')
        .select('id, senha_hash')
        .eq('telefone', v)
        .single()
      if (data) { usuario = data; break }
    }
  }

  if (!usuario) return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })

  const ok = await verificarSenhaUsuario(senha, usuario.senha_hash)
  if (!ok) return NextResponse.json({ error: 'Usuário ou senha incorretos' }, { status: 401 })

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
