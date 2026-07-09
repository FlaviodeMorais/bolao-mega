import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// GET /api/admin/usuarios
// Retorna todos os participantes únicos (por telefone ou e-mail) que já compraram algum bolão,
// cruzando com a tabela usuarios para indicar quem já tem conta.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Busca todos os participantes (loteria + esporte)
  const [{ data: partLot }, { data: partEsp }] = await Promise.all([
    supabase.from('participantes').select('nome, email, telefone, usuario_id, criado_em'),
    supabase.from('participantes_esporte').select('nome, email, telefone, usuario_id, criado_em'),
  ])

  // Busca todas as contas existentes
  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome, email, telefone, chave_pix, senha_temporaria, criado_em')

  const contasPorEmail  = new Map(
    (usuarios || []).filter(u => u.email).map(u => [u.email.toLowerCase(), u])
  )
  const contasPorTel = new Map(
    (usuarios || []).filter(u => u.telefone).map(u => [u.telefone.replace(/\D/g, ''), u])
  )

  // Deduplica participantes por chave (email ou telefone normalizado)
  type ParticipanteRow = { nome: string; email: string | null; telefone: string; usuario_id: string | null; criado_em: string }
  const todos: ParticipanteRow[] = [
    ...((partLot || []) as ParticipanteRow[]),
    ...((partEsp || []) as ParticipanteRow[]),
  ].sort((a, b) => (b.criado_em || '').localeCompare(a.criado_em || ''))

  const visto = new Set<string>()
  const resultado: {
    chave: string
    nome: string
    email: string | null
    telefone: string
    tem_conta: boolean
    usuario_id: string | null
    senha_temporaria: boolean
    criado_em: string | null
  }[] = []

  for (const p of todos) {
    const email = p.email?.toLowerCase().trim() || ''
    const tel   = (p.telefone || '').replace(/\D/g, '')
    const chave = email || tel
    if (!chave || visto.has(chave)) continue
    visto.add(chave)

    const conta = (email && contasPorEmail.get(email)) || (tel && contasPorTel.get(tel)) || null

    resultado.push({
      chave,
      nome:             conta?.nome  || p.nome,
      email:            conta?.email || email || null,
      telefone:         conta?.telefone || p.telefone,
      tem_conta:        !!conta,
      usuario_id:       conta?.id    || null,
      senha_temporaria: conta?.senha_temporaria || false,
      criado_em:        conta?.criado_em || p.criado_em || null,
    })
  }

  return NextResponse.json({ usuarios: resultado })
}
