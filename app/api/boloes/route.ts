import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const todos = req.nextUrl.searchParams.get('todos') === '1'
  let q = supabase.from('boloes').select('*')
  if (!todos) q = q.eq('arquivado', false)
  const { data } = await q
    .order('ativo', { ascending: false })
    .order('criado_em', { ascending: false })
  return NextResponse.json({ boloes: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { nome, slug, loteria, dezenas, num_apostas, taxa_admin, total_cotas, valor_cota } = await req.json()
  if (!nome || !slug) return NextResponse.json({ error: 'Nome e slug obrigatórios' }, { status: 400 })

  const { data, error } = await supabase
    .from('boloes')
    .insert({
      nome, slug,
      loteria:     loteria     || 'mega',
      ativo:       true,
      dezenas:     dezenas     || 6,
      num_apostas: num_apostas || 1,
      taxa_admin:  taxa_admin  || 0,
      total_cotas: total_cotas || 20,
      valor_cota:  valor_cota  || 0,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bolao: data })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const fields: Record<string, unknown> = {}
  if ('dezenas'     in body) fields.dezenas     = body.dezenas
  if ('num_apostas' in body) fields.num_apostas = body.num_apostas
  if ('taxa_admin'  in body) fields.taxa_admin  = body.taxa_admin
  if ('total_cotas' in body) fields.total_cotas = body.total_cotas
  if ('valor_cota'  in body) fields.valor_cota  = body.valor_cota
  if ('ativo'       in body) fields.ativo       = body.ativo
  if ('nome'        in body) fields.nome        = body.nome
  if ('loteria'     in body) fields.loteria     = body.loteria
  if ('arquivado'   in body) fields.arquivado   = body.arquivado

  const { error } = await supabase.from('boloes').update(fields).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { data: bolaoDb } = await supabase.from('boloes').select('slug').eq('id', id).single()
  if (!bolaoDb) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })

  // Exclusão de bolão nunca apaga histórico de participantes (comprovantes,
  // KPIs e o painel de Histórico dependem desses dados permanecerem). Se há
  // participantes, o bolão só pode ser ocultado (Cancelar → ativo=false),
  // nunca excluído de fato - assim os dados históricos ficam sempre intactos.
  const { count } = await supabase
    .from('participantes')
    .select('id', { count: 'exact', head: true })
    .eq('bolao_slug', bolaoDb.slug)
    .neq('status', 'cancelado')

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Este bolão tem ${count} participante(s) no histórico e não pode ser excluído. Use "Cancelar" para ocultá-lo mantendo o histórico.`, count },
      { status: 409 },
    )
  }

  const { error } = await supabase.from('boloes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
