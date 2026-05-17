import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET() {
  const { data } = await supabase
    .from('boloes')
    .select('*')
    .order('criado_em', { ascending: false })
  return NextResponse.json({ boloes: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { nome, slug, dezenas, num_apostas, taxa_admin, total_cotas, valor_cota } = await req.json()
  if (!nome || !slug) return NextResponse.json({ error: 'Nome e slug obrigatórios' }, { status: 400 })

  const { data, error } = await supabase
    .from('boloes')
    .insert({
      nome, slug, ativo: true,
      dezenas:      dezenas     || 6,
      num_apostas:  num_apostas || 1,
      taxa_admin:   taxa_admin  || 0,
      total_cotas:  total_cotas || 20,
      valor_cota:   valor_cota  || 30,
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

  const { id, dezenas, num_apostas, taxa_admin, total_cotas, valor_cota } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('boloes')
    .update({ dezenas, num_apostas, taxa_admin, total_cotas, valor_cota })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
