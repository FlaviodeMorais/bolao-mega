import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET() {
  const { data } = await supabase
    .from('boloes_esporte')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json({ boloes: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const { slug, nome, descricao, competicao, competicao_id, fonte, valor_cota, taxa_admin, total_cotas,
          logo_url, cor_primaria, header_desc, label_cta, label_palpites,
          label_jogo_hoje, label_noticias, premiacao } = body

  if (!slug || !nome || !competicao) return NextResponse.json({ error: 'Campos obrigatórios: slug, nome, competicao' }, { status: 400 })

  const { data, error } = await supabase
    .from('boloes_esporte')
    .insert({ slug, nome, descricao, competicao, competicao_id: competicao_id || null, fonte: fonte || 'manual', valor_cota, taxa_admin, total_cotas,
              logo_url, cor_primaria, header_desc, label_cta, label_palpites,
              label_jogo_hoje, label_noticias, premiacao })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bolao: data })
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { slug, ...updates } = await req.json()
  const { data, error } = await supabase.from('boloes_esporte').update(updates).eq('slug', slug).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bolao: data })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { slug } = await req.json()
  if (!slug) return NextResponse.json({ error: 'slug obrigatório' }, { status: 400 })

  // Apaga jogos, palpites e participantes antes do bolão
  await supabase.from('jogos').delete().eq('bolao_slug', slug)
  await supabase.from('boloes_esporte').delete().eq('slug', slug)

  return NextResponse.json({ ok: true })
}
