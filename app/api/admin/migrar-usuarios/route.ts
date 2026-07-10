import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { hashSenha } from '@/lib/auth-usuario'
import { enviarSenhaTemporaria } from '@/lib/email'
import { enviarConviteWhatsapp } from '@/lib/whatsapp'

function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let senha = ''
  for (let i = 0; i < 8; i++) senha += chars[Math.floor(Math.random() * chars.length)]
  return senha
}

// POST /api/admin/migrar-usuarios — cria contas para TODOS os participantes (com ou sem e-mail),
// envia a senha temporária por e-mail e/ou WhatsApp conforme o que estiver disponível.
// Idempotente: pula quem já tem conta (verifica por e-mail e por telefone).
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: participantes } = await supabase
    .from('participantes')
    .select('nome, telefone, email, created_at')
    .order('created_at', { ascending: true })

  // Deduplica: prefere e-mail como chave primária; sem e-mail usa telefone
  const porEmail  = new Map<string, { nome: string; telefone: string; email: string }>()
  const porTelSemEmail = new Map<string, { nome: string; telefone: string }>()

  for (const p of participantes || []) {
    const email = p.email?.toLowerCase().trim() || ''
    const tel   = (p.telefone || '').replace(/\D/g, '')

    if (email) {
      porEmail.set(email, { nome: p.nome, telefone: tel, email })
    } else if (tel) {
      porTelSemEmail.set(tel, { nome: p.nome, telefone: tel })
    }
  }

  const criados:   string[] = []
  const ignorados: string[] = []
  const erros:     string[] = []

  // Participantes COM e-mail
  for (const [email, dados] of porEmail) {
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single()
    if (existente) { ignorados.push(email); continue }

    const senhaTemp  = gerarSenhaTemporaria()
    const senha_hash = await hashSenha(senhaTemp)

    const { error } = await supabase.from('usuarios').insert({
      nome: dados.nome.trim().toUpperCase(), email, telefone: dados.telefone, senha_hash, senha_temporaria: true,
    })
    if (error) { erros.push(`${email}: ${error.message}`); continue }

    const msg = `🔑 *Sua conta foi criada — BetMais*\n\nOlá *${dados.nome}*!\n\nSua senha temporária é: *${senhaTemp}*\n\n_Acesse o app e troque sua senha após o primeiro login._`

    const [emailRes, waRes] = await Promise.all([
      enviarSenhaTemporaria(email, dados.nome, senhaTemp),
      dados.telefone ? enviarConviteWhatsapp(dados.telefone, msg) : Promise.resolve(null),
    ])

    const falhas: string[] = []
    if (!emailRes.ok) falhas.push(`e-mail: ${emailRes.erro}`)
    if (waRes && !waRes.ok) falhas.push(`WA: ${waRes.erro}`)
    if (falhas.length) erros.push(`${email}: conta criada, mas falha ao notificar (${falhas.join('; ')})`)
    else criados.push(email)
  }

  // Participantes SEM e-mail (chave = telefone)
  for (const [tel, dados] of porTelSemEmail) {
    const { data: existente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('telefone', tel)
      .is('email', null)
      .single()
    if (existente) { ignorados.push(`tel:${tel}`); continue }

    const senhaTemp  = gerarSenhaTemporaria()
    const senha_hash = await hashSenha(senhaTemp)

    const { error } = await supabase.from('usuarios').insert({
      nome: dados.nome, email: null, telefone: tel, senha_hash, senha_temporaria: true,
    })
    if (error) { erros.push(`tel:${tel}: ${error.message}`); continue }

    const msg = `🔑 *Sua conta foi criada — BetMais*\n\nOlá *${dados.nome}*!\n\nSua senha temporária é: *${senhaTemp}*\n\n_Acesse o app e troque sua senha após o primeiro login._`
    const waRes = await enviarConviteWhatsapp(tel, msg)

    if (!waRes.ok) erros.push(`tel:${tel}: conta criada, mas falha ao notificar via WA (${waRes.erro})`)
    else criados.push(`tel:${tel}`)
  }

  return NextResponse.json({ ok: true, criados, ignorados, erros })
}
