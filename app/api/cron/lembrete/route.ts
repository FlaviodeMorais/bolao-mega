import { NextRequest, NextResponse } from 'next/server'
import { notificarLembrete } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Busca concurso ativo
  const { data: cfg } = await supabase
    .from('config')
    .select('key, value')
  const map = Object.fromEntries((cfg || []).map(r => [r.key, r.value]))
  const concurso = parseInt(map['concurso_ativo'] || '0')
  if (!concurso) return NextResponse.json({ ok: false, msg: 'Sem concurso ativo' })

  // Conta pagamentos pendentes
  const { count } = await supabase
    .from('participantes')
    .select('*', { count: 'exact', head: true })
    .eq('concurso', concurso)
    .eq('status', 'aguardando')

  if (!count || count === 0) {
    return NextResponse.json({ ok: true, msg: 'Sem pendências' })
  }

  await notificarLembrete(concurso, count)
  return NextResponse.json({ ok: true, pendentes: count })
}
