import { NextRequest, NextResponse } from 'next/server'
import { notificarLembrete } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import { LOTERIA_LIST } from '@/lib/loterias'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: cfg } = await supabase
    .from('config')
    .select('key, value')
  const map = Object.fromEntries((cfg || []).map(r => [r.key, r.value]))

  const resultados: Record<string, unknown> = {}

  for (const loteria of LOTERIA_LIST) {
    const concurso = parseInt(map[`concurso_ativo_${loteria.id}`] || (loteria.id === 'mega' ? map['concurso_ativo'] : '') || '0')
    if (!concurso) {
      resultados[loteria.id] = { ok: false, msg: 'Sem concurso ativo' }
      continue
    }

    // Bolões ativos dessa loteria, para isolar participantes por loteria
    const { data: boloes } = await supabase
      .from('boloes')
      .select('slug')
      .eq('loteria', loteria.id)
      .eq('ativo', true)
    const slugs = (boloes || []).map(b => b.slug)
    if (slugs.length === 0) {
      resultados[loteria.id] = { ok: true, msg: 'Sem bolões ativos' }
      continue
    }

    const { count } = await supabase
      .from('participantes')
      .select('*', { count: 'exact', head: true })
      .eq('concurso', concurso)
      .eq('status', 'aguardando')
      .in('bolao_slug', slugs)

    if (!count || count === 0) {
      resultados[loteria.id] = { ok: true, msg: 'Sem pendências' }
      continue
    }

    await notificarLembrete(concurso, count)
    resultados[loteria.id] = { ok: true, pendentes: count }
  }

  return NextResponse.json({ ok: true, resultados })
}
