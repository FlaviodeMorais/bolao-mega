import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buscarEAplicarResultados } from '@/lib/esporte-resultado'

// Cron: percorre todos os bolões esportivos ativos (não encerrados) e busca
// automaticamente no football-data.org os placares de jogos já finalizados,
// aplicando o resultado (e recalculando pontos) em qualquer jogo local ainda
// não conferido. Complementa o botão manual "🔄 Buscar resultados" no admin.
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: boloes } = await supabase
    .from('boloes_esporte')
    .select('slug')
    .eq('encerrado', false)
    .not('competicao_id', 'is', null)

  const resultados: Record<string, unknown> = {}

  for (const b of boloes || []) {
    resultados[b.slug] = await buscarEAplicarResultados(b.slug)
  }

  return NextResponse.json({ resultados })
}
