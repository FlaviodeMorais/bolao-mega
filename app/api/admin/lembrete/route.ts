import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarLembrete } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { concurso, bolao_slug } = await req.json()
  if (!concurso) return NextResponse.json({ error: 'Concurso obrigatório' }, { status: 400 })

  let query = supabase
    .from('participantes')
    .select('id', { count: 'exact', head: true })
    .eq('concurso', concurso)
    .eq('status', 'aguardando')

  if (bolao_slug) query = query.eq('bolao_slug', bolao_slug)

  const { count } = await query
  await notificarLembrete(concurso, count || 0)

  return NextResponse.json({ ok: true, pendentes: count || 0 })
}
