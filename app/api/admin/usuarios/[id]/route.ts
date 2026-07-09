import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { hashSenha } from '@/lib/auth-usuario'
import { enviarSenhaTemporaria } from '@/lib/email'
import { enviarConviteWhatsapp } from '@/lib/whatsapp'

function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

async function auth(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token && (await verificarToken(token))
}

// PATCH /api/admin/usuarios/[id] — edita nome, email, telefone, chave_pix
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const campos: Record<string, string> = {}
  if (body.nome)      campos.nome      = String(body.nome).trim()
  if (body.email)     campos.email     = String(body.email).toLowerCase().trim()
  if (body.telefone)  campos.telefone  = String(body.telefone).replace(/\D/g, '')
  if (body.chave_pix) campos.chave_pix = String(body.chave_pix).trim()

  const { error } = await supabase.from('usuarios').update(campos).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/admin/usuarios/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const { error } = await supabase.from('usuarios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// POST /api/admin/usuarios/[id]?action=resetar-senha
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await auth(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const { id } = await params
  const { via } = await req.json().catch(() => ({ via: ['email'] }))

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome, email, telefone')
    .eq('id', id)
    .single()

  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const senhaTemp = gerarSenhaTemporaria()
  const senha_hash = await hashSenha(senhaTemp)

  const { error } = await supabase
    .from('usuarios')
    .update({ senha_hash, senha_temporaria: true })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const resultados: Record<string, string> = {}

  if (!via || via.includes('email')) {
    const res = await enviarSenhaTemporaria(usuario.email, usuario.nome, senhaTemp)
    resultados.email = res.ok ? 'enviado' : `erro: ${res.erro}`
  }

  if (via?.includes('whatsapp') && usuario.telefone) {
    const waRes = await enviarConviteWhatsapp(
      usuario.telefone,
      `🔑 *Nova senha temporária — BetMais*\n\n` +
      `Olá *${usuario.nome}*!\n\n` +
      `Sua senha temporária é: *${senhaTemp}*\n\n` +
      `_Acesse o app e troque sua senha após o primeiro login._`
    )
    resultados.whatsapp = waRes.ok ? 'enviado' : `erro: ${waRes.erro}`
  }

  return NextResponse.json({ ok: true, resultados })
}
