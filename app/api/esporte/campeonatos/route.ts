import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabase
    .from('competicoes_esporte')
    .select('*')
    .order('nome', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competicoes: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { nome, logo_url, cor, fonte, api_competition_id, temporada } = body
  if (!nome) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  if (fonte === 'api-football' && !api_competition_id) {
    return NextResponse.json({ error: 'Informe o ID da liga na API-Football' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('competicoes_esporte')
    .insert({ nome, logo_url: logo_url || null, cor: cor || '#FFB81C', fonte: fonte || 'manual', api_competition_id: api_competition_id || null, temporada: temporada || null })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competicao: data })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const { data, error } = await supabase.from('competicoes_esporte').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ competicao: data })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // Não permite excluir campeonato em uso por algum bolão
  const { count } = await supabase
    .from('boloes_esporte')
    .select('id', { count: 'exact', head: true })
    .eq('competicao_id', id)
  if (count && count > 0) {
    return NextResponse.json({ error: `Campeonato em uso por ${count} bolão(ões). Remova ou reatribua antes de excluir.` }, { status: 409 })
  }

  const { error } = await supabase.from('competicoes_esporte').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
