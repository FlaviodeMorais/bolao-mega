import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ jogos: [] })

  const { data } = await supabase
    .from('jogos')
    .select('*')
    .eq('bolao_slug', slug)
    .order('data_jogo', { ascending: true, nullsFirst: false })
    .order('hora_jogo', { ascending: true, nullsFirst: false })
    .order('ordem', { ascending: true })

  return NextResponse.json({ jogos: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { bolao_slug, time_casa, time_fora, bandeira_casa, bandeira_fora, data_jogo, hora_jogo, fase, grupo, ordem } = body

  if (!bolao_slug || !time_casa || !time_fora) return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })

  const { data, error } = await supabase
    .from('jogos')
    .insert({ bolao_slug, time_casa, time_fora, bandeira_casa, bandeira_fora, data_jogo, hora_jogo, fase, grupo, ordem: ordem || 0 })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jogo: data })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const { data, error } = await supabase.from('jogos').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jogo: data })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('jogos').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
