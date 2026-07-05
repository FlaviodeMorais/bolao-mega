import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { exportarParaSheets } from '@/lib/google-sheets'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug, concurso } = await req.json()
  if (!bolao_slug) return NextResponse.json({ error: 'bolao_slug obrigatório' }, { status: 400 })

  let query = supabase
    .from('participantes')
    .select('nome, telefone, email, cotas, total, status, created_at')
    .eq('bolao_slug', bolao_slug)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: true })

  if (concurso) query = query.eq('concurso', parseInt(concurso))

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const headers = ['Nome', 'Telefone', 'E-mail', 'Cotas', 'Total (R$)', 'Status', 'Data']
  const linhas = (data || []).map(p => [
    p.nome,
    p.telefone || '',
    p.email || '',
    Array.isArray(p.cotas) ? p.cotas.join(', ') : '',
    Number(p.total).toFixed(2),
    p.status,
    new Date(p.created_at).toLocaleString('pt-BR'),
  ])

  try {
    await exportarParaSheets(bolao_slug, headers, linhas)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao exportar' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, total: linhas.length })
}
