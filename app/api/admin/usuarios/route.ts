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
    supabase.from('participantes').select('nome, email, telefone, usuario_id, created_at'),
    supabase.from('participantes_esporte').select('nome, email, telefone, usuario_id, created_at'),
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
  type ParticipanteRow = { nome: string; email: string | null; telefone: string; usuario_id: string | null; created_at: string }
  const todos: ParticipanteRow[] = [
    ...((partLot || []) as ParticipanteRow[]),
    ...((partEsp || []) as ParticipanteRow[]),
  ].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  const visto = new Set<string>()
  const resultado: {
    chave: string
    nome: string
    email: string | null
    telefone: string
    tem_conta: boolean
    usuario_id: string | null
    senha_temporaria: boolean
    created_at: string | null
  }[] = []

  function telVariants(t: string): string[] {
    const d = (t || '').replace(/\D/g, '')
    if (!d) return []
    const base = d.startsWith('55') ? d.slice(2) : d
    return [base, `55${base}`]
  }

  for (const p of todos) {
    const email = p.email?.toLowerCase().trim() || ''
    const tel   = (p.telefone || '').replace(/\D/g, '')
    const vars  = telVariants(tel)

    const jaVisto = (email && visto.has(email)) || vars.some(v => visto.has(v))
    if (!email && !tel) continue
    if (jaVisto) continue

    if (email) visto.add(email)
    vars.forEach(v => visto.add(v))

    const chave = email || tel
    const conta = (email && contasPorEmail.get(email)) || (tel && contasPorTel.get(tel)) || null

    resultado.push({
      chave,
      nome:             conta?.nome  || p.nome,
      email:            conta?.email || email || null,
      telefone:         conta?.telefone || p.telefone,
      tem_conta:        !!conta,
      usuario_id:       conta?.id    || null,
      senha_temporaria: conta?.senha_temporaria || false,
      created_at:       conta?.criado_em || p.created_at || null,
    })
  }

  // Inclui contas da tabela usuarios que não apareceram via participantes
  const idsVistos = new Set(resultado.filter(r => r.usuario_id).map(r => r.usuario_id))
  for (const u of usuarios || []) {
    if (idsVistos.has(u.id)) continue
    const email = u.email?.toLowerCase() || ''
    const tel   = (u.telefone || '').replace(/\D/g, '')
    const vars  = telVariants(tel)
    const jaVisto = (email && visto.has(email)) || vars.some(v => visto.has(v))
    if (jaVisto) continue

    if (email) visto.add(email)
    vars.forEach(v => visto.add(v))

    resultado.push({
      chave:            email || tel || u.id,
      nome:             u.nome,
      email:            u.email || null,
      telefone:         u.telefone || '',
      tem_conta:        true,
      usuario_id:       u.id,
      senha_temporaria: u.senha_temporaria || false,
      created_at:       u.criado_em || null,
    })
  }

  return NextResponse.json({ usuarios: resultado })
}
