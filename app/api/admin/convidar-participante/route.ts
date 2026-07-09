import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { hashSenha } from '@/lib/auth-usuario'
import { enviarSenhaTemporaria } from '@/lib/email'
import { enviarConviteWhatsapp } from '@/lib/whatsapp'

function gerarSenha(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

// POST /api/admin/convidar-participante
// Cria conta (se não existir) e envia senha temporária por e-mail e/ou WhatsApp.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { nome, email, telefone, via }: {
    nome: string
    email?: string
    telefone?: string
    via: string[]
  } = await req.json()

  if (!nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })
  if (!email && !telefone) return NextResponse.json({ error: 'E-mail ou telefone obrigatório' }, { status: 400 })

  const emailNorm = email?.toLowerCase().trim() || null
  const telNorm   = (telefone || '').replace(/\D/g, '') || null

  // Verifica se já tem conta
  let existente: { id: string } | null = null
  if (emailNorm) {
    const { data } = await supabase.from('usuarios').select('id').eq('email', emailNorm).single()
    existente = data
  }
  if (!existente && telNorm) {
    const { data } = await supabase.from('usuarios').select('id').eq('telefone', telNorm).single()
    existente = data
  }

  const senhaTemp  = gerarSenha()
  const senha_hash = await hashSenha(senhaTemp)

  if (!existente) {
    const { error } = await supabase.from('usuarios').insert({
      nome: nome.trim().toUpperCase(), email: emailNorm, telefone: telNorm, senha_hash, senha_temporaria: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    // Já tem conta — apenas atualiza a senha
    await supabase.from('usuarios').update({ senha_hash, senha_temporaria: true }).eq('id', existente.id)
  }

  const resultados: Record<string, string> = {}
  const msg = `🔑 *Seu acesso ao BetMais*\n\nOlá *${nome}*!\n\nSua senha temporária é: *${senhaTemp}*\n\n_Acesse o app com seu celular ou e-mail e troque sua senha após o primeiro login._`

  if (via.includes('email') && emailNorm) {
    const r = await enviarSenhaTemporaria(emailNorm, nome, senhaTemp)
    resultados.email = r.ok ? 'enviado ✅' : `falha: ${r.erro}`
  }
  if (via.includes('whatsapp') && telNorm) {
    const r = await enviarConviteWhatsapp(telNorm, msg)
    resultados.whatsapp = r.ok ? 'enviado ✅' : `falha: ${r.erro}`
  }

  return NextResponse.json({ ok: true, criada: !existente, resultados })
}
