import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Lê da view historico_resumo (loteria + esporte já agregados no Postgres via
// GROUP BY) — não traz a tabela de participantes inteira pro Node.
export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('historico_resumo')
    .select('*')
    .order('concurso', { ascending: false, nullsFirst: false })
    .order('bolao_nome', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ historico: data || [] })
}
