import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { hashSenha } from '@/lib/auth-usuario'
import { enviarSenhaTemporaria } from '@/lib/email'
import { enviarConviteWhatsapp } from '@/lib/whatsapp'

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// POST /api/usuario/esqueci-senha
// Recebe e-mail ou telefone, gera nova senha temporária e envia pelo canal disponível.
export async function POST(req: NextRequest) {
  const { identificador } = await req.json()
  if (!identificador) return NextResponse.json({ error: 'Informe seu e-mail ou celular' }, { status: 400 })

  const id      = String(identificador).trim()
  const isEmail = id.includes('@')
  const telNorm = id.replace(/\D/g, '')

  let usuario: { id: string; nome: string; email: string | null; telefone: string | null } | null = null

  if (isEmail) {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome, email, telefone')
      .eq('email', id.toLowerCase())
      .single()
    usuario = data
  } else {
    const variants = [telNorm, telNorm.replace(/^55/, ''), `55${telNorm}`].filter(Boolean)
    for (const v of variants) {
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome, email, telefone')
        .eq('telefone', v)
        .single()
      if (data) { usuario = data; break }
    }
  }

  // Retorna sempre OK para não revelar se o usuário existe
  if (!usuario) return NextResponse.json({ ok: true })

  const senhaTemp  = gerarSenha()
  const senha_hash = await hashSenha(senhaTemp)
  await supabase.from('usuarios').update({ senha_hash, senha_temporaria: true }).eq('id', usuario.id)

  const msg = `🔑 *Redefinição de senha — BetMais*\n\nOlá *${usuario.nome}*!\n\nSua nova senha temporária é: *${senhaTemp}*\n\n_Acesse o app e troque sua senha após o login._`

  await Promise.all([
    usuario.email   ? enviarSenhaTemporaria(usuario.email, usuario.nome, senhaTemp) : null,
    usuario.telefone ? enviarConviteWhatsapp(usuario.telefone, msg) : null,
  ])

  return NextResponse.json({ ok: true })
}
