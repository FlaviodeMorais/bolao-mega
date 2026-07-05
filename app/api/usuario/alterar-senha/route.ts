import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarTokenUsuario, hashSenha, verificarSenhaUsuario } from '@/lib/auth-usuario'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  const uid = token ? await verificarTokenUsuario(token) : null
  if (!uid) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { senhaAtual, novaSenha } = await req.json()
  if (!senhaAtual || !novaSenha) return NextResponse.json({ error: 'Preencha a senha atual e a nova senha' }, { status: 400 })
  if (novaSenha.length < 6) return NextResponse.json({ error: 'Nova senha deve ter ao menos 6 caracteres' }, { status: 400 })

  const { data: usuario } = await supabase.from('usuarios').select('senha_hash').eq('id', uid).single()
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const ok = await verificarSenhaUsuario(senhaAtual, usuario.senha_hash)
  if (!ok) return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 })

  const senha_hash = await hashSenha(novaSenha)
  const { error } = await supabase.from('usuarios').update({ senha_hash, senha_temporaria: false }).eq('id', uid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
