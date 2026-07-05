import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { gerarTokenUsuario, hashSenha } from '@/lib/auth-usuario'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const { nome, email, telefone, senha, chavePix } = await req.json()

  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!email || !EMAIL_RE.test(email)) return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
  const digitos = String(telefone || '').replace(/\D/g, '')
  if (digitos.length < 10 || digitos.length > 11) return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 })
  if (!senha || senha.length < 6) return NextResponse.json({ error: 'Senha deve ter ao menos 6 caracteres' }, { status: 400 })
  if (!chavePix?.trim()) return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })

  const emailNorm = String(email).toLowerCase().trim()

  const { data: existente } = await supabase.from('usuarios').select('id').eq('email', emailNorm).single()
  if (existente) return NextResponse.json({ error: 'Já existe uma conta com este e-mail' }, { status: 409 })

  const senha_hash = await hashSenha(senha)
  const { data, error } = await supabase
    .from('usuarios')
    .insert({ nome: nome.trim(), email: emailNorm, telefone: digitos, senha_hash, chave_pix: chavePix.trim() })
    .select('id')
    .single()

  if (error || !data) return NextResponse.json({ error: error?.message || 'Erro ao criar conta' }, { status: 500 })

  const token = await gerarTokenUsuario(data.id)
  const res = NextResponse.json({ ok: true })
  res.cookies.set('user_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })
  return res
}
