import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { hashSenha } from '@/lib/auth-usuario'
import { enviarSenhaTemporaria } from '@/lib/email'

function gerarSenhaTemporaria(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let senha = ''
  for (let i = 0; i < 8; i++) senha += chars[Math.floor(Math.random() * chars.length)]
  return senha
}

// POST /api/admin/migrar-usuarios — cria contas de usuário (login/cadastro) para
// participantes já cadastrados com e-mail (histórico anterior à Fase 1), gera uma
// senha temporária por conta e envia por e-mail. Idempotente: pula quem já tem conta.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: participantes } = await supabase
    .from('participantes')
    .select('nome, telefone, email, created_at')
    .not('email', 'is', null)
    .neq('email', '')
    .order('created_at', { ascending: true })

  const porEmail = new Map<string, { nome: string; telefone: string }>()
  for (const p of participantes || []) {
    const email = p.email.toLowerCase().trim()
    porEmail.set(email, { nome: p.nome, telefone: p.telefone }) // mantém o registro mais recente (ordenado asc)
  }

  const criados: string[] = []
  const ignorados: string[] = []
  const erros: string[] = []

  for (const [email, dados] of porEmail) {
    const { data: existente } = await supabase.from('usuarios').select('id').eq('email', email).single()
    if (existente) { ignorados.push(email); continue }

    const senhaTemporaria = gerarSenhaTemporaria()
    const senha_hash = await hashSenha(senhaTemporaria)

    const { error } = await supabase.from('usuarios').insert({
      nome: dados.nome, email, telefone: dados.telefone, senha_hash,
    })

    if (error) { erros.push(`${email}: ${error.message}`); continue }

    const envio = await enviarSenhaTemporaria(email, dados.nome, senhaTemporaria)
    if (!envio.ok) erros.push(`${email}: conta criada, mas falha ao enviar e-mail (${envio.erro})`)
    else criados.push(email)
  }

  return NextResponse.json({ ok: true, criados, ignorados, erros })
}
