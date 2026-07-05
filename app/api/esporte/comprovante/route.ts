import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Endpoint público (sem auth) — usado pelo link individual do comprovante
// (?pub=1) e pela impressão em lote do admin, análogo ao que
// GET /api/participantes já faz pro lado loteria.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  let bolaoSlug = req.nextUrl.searchParams.get('bolao')
  if (!id && !bolaoSlug) return NextResponse.json({ error: 'id ou bolao obrigatório' }, { status: 400 })

  // Se só veio o id, descobre o bolao_slug antes — o número de controle (nº)
  // precisa da lista INTEIRA do bolão (ordem de inscrição), não só do
  // participante filtrado, senão todo link individual mostraria "Nº 001".
  if (id && !bolaoSlug) {
    const { data: alvo } = await supabase.from('participantes_esporte').select('bolao_slug').eq('id', id).single()
    if (!alvo) return NextResponse.json({ participantes: [], bolao: null })
    bolaoSlug = alvo.bolao_slug
  }

  const { data: participantes, error } = await supabase
    .from('participantes_esporte')
    .select('id, nome, telefone, email, total, status, pontos_total, created_at, bolao_slug')
    .eq('bolao_slug', bolaoSlug!)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!participantes?.length) return NextResponse.json({ participantes: [], bolao: null })

  const slug = bolaoSlug!

  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('nome, slug, competicao, valor_cota, encerrado, logo_url')
    .eq('slug', slug)
    .single()

  const { data: jogos } = await supabase
    .from('jogos')
    .select('id, time_casa, time_fora, gol_casa, gol_fora, fase, data_jogo, hora_jogo, encerrado')
    .eq('bolao_slug', slug)
    .order('data_jogo', { ascending: true, nullsFirst: false })
    .order('hora_jogo', { ascending: true, nullsFirst: false })

  const jogosMap = new Map((jogos || []).map(j => [j.id, j]))

  const participanteIds = participantes.map(p => p.id)
  const { data: palpites } = await supabase
    .from('palpites')
    .select('participante_id, jogo_id, gol_casa, gol_fora, pontos')
    .in('participante_id', participanteIds)

  const palpitesPorParticipante: Record<string, unknown[]> = {}
  for (const pl of palpites || []) {
    const jogo = jogosMap.get(pl.jogo_id)
    if (!jogo) continue
    ;(palpitesPorParticipante[pl.participante_id] ??= []).push({
      jogo_id: pl.jogo_id,
      time_casa: jogo.time_casa,
      time_fora: jogo.time_fora,
      gol_casa_real: jogo.gol_casa,
      gol_fora_real: jogo.gol_fora,
      palpite_casa: pl.gol_casa,
      palpite_fora: pl.gol_fora,
      pontos: pl.pontos,
      encerrado: jogo.encerrado,
      fase: jogo.fase,
      data_jogo: jogo.data_jogo,
      hora_jogo: jogo.hora_jogo,
    })
  }

  const resultado = participantes.map((p, i) => ({
    ...p,
    numero: i + 1, // posição de inscrição no bolão — nº de controle do comprovante
    palpites: palpitesPorParticipante[p.id] || [],
  }))

  return NextResponse.json({ participantes: resultado, bolao })
}
