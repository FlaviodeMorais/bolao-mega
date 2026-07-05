import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

const PAGE_SIZE = 30
const LIMITE_CONTATOS = 300 // teto do disparo em massa (ver /api/admin/convite-massa)

// Lê da view historico_participantes (loteria + esporte unificados) — busca,
// filtros e paginação são resolvidos no Postgres via query, nunca trazendo
// a tabela inteira pro Node.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const params = req.nextUrl.searchParams
  const busca    = params.get('busca')?.trim()
  const bolao    = params.get('bolao')
  const concurso = params.get('concurso')
  const tipo     = params.get('tipo')          // 'loteria' | 'esporte' | null (todos)
  const page     = Math.max(1, parseInt(params.get('page') || '1'))
  // Contatos p/ disparo em massa: ignora paginação, traz só o necessário pro envio
  const paraContato = params.get('paraContato') === '1'

  let query = supabase
    .from('historico_participantes')
    .select(paraContato ? 'id, nome, telefone' : '*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (tipo === 'loteria' || tipo === 'esporte') query = query.eq('tipo', tipo)
  if (bolao)    query = query.eq('bolao_slug', bolao)
  if (concurso) query = query.eq('concurso', parseInt(concurso))
  if (busca)    query = query.or(`nome.ilike.%${busca}%,telefone.ilike.%${busca}%`)

  if (paraContato) {
    const { data, error } = await query.not('telefone', 'is', null).range(0, LIMITE_CONTATOS - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ contatos: data || [] })
  }

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1
  const { data, error, count } = await query.range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    participantes: data || [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE)),
  })
}
